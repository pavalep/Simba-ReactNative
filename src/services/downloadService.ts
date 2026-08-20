import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {isRemoteUri, cacheKeyFromUri} from '../utils/mediaUri';
import type {MediaKind, MediaLane, MediaSource} from '../types/media';
import {normalizeMediaClassification} from '../types/media';

/**
 * 49.1/49.6: Download manager for offline playback.
 *
 * - Files live under <DocumentDirectoryPath>/downloads (persistent, not cache).
 * - The AsyncStorage manifest ("simba-downloads-v1") is the source of truth and
 *   survives app restarts; redux downloadsSlice is a reactive UI mirror.
 * - The in-memory map powers the SYNC offline remap used by MpvPlayer.loadFile
 *   (see player.api.ts) so every playback entry point prefers the local copy.
 * - Pause = RNFS.stopDownload; resume = a fresh downloadFile (resumable is
 *   iOS-only in react-native-fs ^2.20). Partial files are unlinked on resume.
 * - Auto-delete keeps the last N completed downloads (0 = off), applied on
 *   hydration and after every successful download.
 *
 * NOTE: this module must stay free of player/navigation imports to avoid
 * import cycles (player.api.ts consumes getLocalPath).
 */

export type DownloadStatus = 'idle' | 'downloading' | 'paused' | 'done' | 'error';

export interface DownloadRecord {
  uri: string;
  localPath: string;
  title: string;
  /** Total expected bytes (0 = unknown until the begin callback fires). */
  size: number;
  /** Bytes written so far. */
  received: number;
  status: DownloadStatus;
    mediaType: MediaLane;
  type: MediaKind;
  source: MediaSource;
  provider?: string;
  downloadedAt: number | null;

  error?: string;
}

export interface DownloadRequest {
  uri: string;
  title: string;
    mediaType?: MediaLane;
  type?: MediaKind;
  source?: MediaSource;
  provider?: string;

}

const MANIFEST_KEY = 'simba-downloads-v1';
const POLICY_KEY = 'simba-download-policy-v1';
const DOWNLOAD_DIR = `${RNFS.DocumentDirectoryPath}/downloads`;

let records: DownloadRecord[] = [];
let loaded = false;
let loadPromise: Promise<DownloadRecord[]> | null = null;
let keepLastN = 0;
const activeJobs = new Map<string, number>();
const listeners = new Set<(records: DownloadRecord[]) => void>();

function emit(): void {
  const snapshot = [...records];
  listeners.forEach(cb => cb(snapshot));
}

function persist(): void {
  AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(records)).catch(() => {
    // non-fatal — manifest is a convenience cache of the in-memory state
  });
}

function persistPolicy(): void {
  AsyncStorage.setItem(POLICY_KEY, String(keepLastN)).catch(() => {});
}

/** Drop excess completed downloads (oldest first) per the keep-last-N policy. */
async function applyAutoDeletePolicy(): Promise<void> {
  if (keepLastN <= 0) return;
  const done = records
    .filter(r => r.status === 'done')
    .sort((a, b) => (a.downloadedAt ?? 0) - (b.downloadedAt ?? 0));
  const excess = done.slice(0, Math.max(0, done.length - keepLastN));
  if (excess.length === 0) return;
  for (const record of excess) {
    await RNFS.unlink(record.localPath).catch(() => {});
    records = records.filter(r => r.uri !== record.uri);
  }
  persist();
  emit();
}

function upsertRecord(record: DownloadRecord): void {
  const idx = records.findIndex(r => r.uri === record.uri);
  if (idx >= 0) records[idx] = record;
  else records.push(record);
  persist();
  emit();
}

function updateRecord(uri: string, patch: Partial<DownloadRecord>): void {
  const record = records.find(r => r.uri === uri);
  if (!record) return;
  Object.assign(record, patch);
  persist();
  emit();
}

function fileExtension(uri: string): string {
  try {
    const name = decodeURIComponent(uri.split(/[/\\?]/).pop() ?? '');
    const dot = name.lastIndexOf('.');
    return dot >= 0 && name.slice(dot + 1).length <= 5
      ? name.slice(dot + 1).toLowerCase()
      : 'mp3';
  } catch {
    return 'mp3';
  }
}

function sanitizeSegment(input: string): string {
  return (
    input
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .replace(/\s+/g, '_')
      .trim()
      .slice(0, 48) || 'track'
  );
}

/** Kicks off hydration at import time so the sync remap is ready by first play. */
ensureLoaded().catch(() => {});

export function ensureLoaded(): Promise<DownloadRecord[]> {
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        await RNFS.mkdir(DOWNLOAD_DIR).catch(() => {});
        const [raw, policyRaw] = await Promise.all([
          AsyncStorage.getItem(MANIFEST_KEY),
          AsyncStorage.getItem(POLICY_KEY),
        ]);
        keepLastN = policyRaw ? (parseInt(policyRaw, 10) || 0) : 0;
        if (raw) {
                    const parsed = JSON.parse(raw) as Array<Partial<DownloadRecord>>;
          records = parsed
            .filter(
              r => typeof r.uri === 'string' && typeof r.localPath === 'string',
            )
            .map(r => ({
              ...r,
              ...normalizeMediaClassification({
                source: r.source,
                type: r.type,
                mediaType: r.mediaType,
                provider: r.provider,
              }),
            } as DownloadRecord));

        }
        // Drop entries whose file vanished; interrupted transfers restart paused.
        const checked: DownloadRecord[] = [];
        for (const r of records) {
          const exists = await RNFS.exists(r.localPath);
          if (!exists) continue;
          checked.push(
            r.status === 'done'
              ? r
              : {...r, status: 'paused', received: 0, size: 0, error: undefined},
          );
        }
        records = checked;
        await applyAutoDeletePolicy();
        persist();
      } catch {
        records = [];
      }
      loaded = true;
      emit();
      return [...records];
    })();
  }
  return loadPromise;
}

export function isLoaded(): boolean {
  return loaded;
}

export function getRecords(): DownloadRecord[] {
  return [...records];
}

export function getKeepLastN(): number {
  return keepLastN;
}

/**
 * 49.4: sync offline remap — returns the local file path when the remote uri
 * has a completed download, null otherwise. The in-memory map is populated by
 * ensureLoaded() (fire-and-forget at module import + explicit at app boot).
 */
export function getLocalPath(remoteUri: string): string | null {
  if (!loaded || !isRemoteUri(remoteUri)) return null;
  const record = records.find(r => r.uri === remoteUri && r.status === 'done');
  return record ? record.localPath : null;
}

export function subscribe(
  cb: (records: DownloadRecord[]) => void,
): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** 49.1: start (or restart) a download. No-op when already downloading/done. */
export async function startDownload(request: DownloadRequest): Promise<void> {
  await ensureLoaded();
  const existing = records.find(r => r.uri === request.uri);
  if (
    existing &&
    (existing.status === 'downloading' || existing.status === 'done')
  ) {
    return;
  }
  if (!isRemoteUri(request.uri)) return;

  const localPath = `${DOWNLOAD_DIR}/${sanitizeSegment(request.title)}-${cacheKeyFromUri(request.uri)}.${fileExtension(request.uri)}`;
    const record: DownloadRecord = {
    uri: request.uri,
    localPath,
    title: request.title || 'Untitled',
    size: 0,
    received: 0,
    status: 'downloading',
    ...normalizeMediaClassification({
      source: request.source ?? 'api',
      type: request.type,
      mediaType: request.mediaType,
      provider: request.provider,
    }),
    downloadedAt: null,
  };

  upsertRecord(record);

  // A stale partial from an interrupted transfer would corrupt the fresh one.
  if (await RNFS.exists(localPath).catch(() => false)) {
    await RNFS.unlink(localPath).catch(() => {});
  }

  const job = RNFS.downloadFile({
    fromUrl: request.uri,
    toFile: localPath,
    progressDivider: 64,
    begin: res => {
      if (res.statusCode >= 400) return;
      updateRecord(request.uri, {size: res.contentLength || 0});
    },
    progress: res => {
      updateRecord(request.uri, {received: res.bytesWritten});
    },
  });
  activeJobs.set(request.uri, job.jobId);

  try {
    const result = await job.promise;
    if (result.statusCode >= 400) {
      throw new Error(`HTTP ${result.statusCode}`);
    }
    updateRecord(request.uri, {
      status: 'done',
      received: result.bytesWritten,
      size: result.bytesWritten || result.statusCode,
      downloadedAt: Date.now(),
      error: undefined,
    });
    activeJobs.delete(request.uri);
    await applyAutoDeletePolicy();
  } catch (err) {
    activeJobs.delete(request.uri);
    const recordNow = records.find(r => r.uri === request.uri);
    if (recordNow && recordNow.status !== 'paused') {
      updateRecord(request.uri, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Download failed',
      });
    }
  }
}

/** 49.3: stop the transfer and mark the record paused (keeps partial state). */
export async function pauseDownload(uri: string): Promise<void> {
  const jobId = activeJobs.get(uri);
  if (jobId !== undefined) {
    try {
      RNFS.stopDownload(jobId);
    } catch {
      // job may have finished between the lookup and the stop
    }
    activeJobs.delete(uri);
  }
  updateRecord(uri, {status: 'paused', error: undefined});
}

/**
 * 49.3: resume a paused download. react-native-fs resumable/resumeDownload are
 * iOS-only, so Android resumes with a fresh downloadFile (size/url unchanged).
 */
export async function resumeDownload(uri: string): Promise<void> {
  const record = records.find(r => r.uri === uri);
  if (!record || record.status === 'downloading') return;
  updateRecord(uri, {status: 'downloading', received: 0, size: 0, error: undefined});
  await startDownload({
    uri: record.uri,
    title: record.title,
    mediaType: record.mediaType,
    type: record.type,
    source: record.source,
    provider: record.provider,
  });
}

/** Explicit recovery entry point for failed transfers. */
export async function retryDownload(uri: string): Promise<void> {
  await resumeDownload(uri);
}

/** 49.3: stop, unlink and forget a download (and its partial file). */
export async function removeDownload(uri: string): Promise<void> {
  const jobId = activeJobs.get(uri);
  if (jobId !== undefined) {
    try {
      RNFS.stopDownload(jobId);
    } catch {
      // ignore
    }
    activeJobs.delete(uri);
  }
  const record = records.find(r => r.uri === uri);
  if (record) {
    await RNFS.unlink(record.localPath).catch(() => {});
  }
  records = records.filter(r => r.uri !== uri);
  persist();
  emit();
}

/** 49.6: keep last N completed downloads (0 = off). Applies immediately. */
export async function setKeepLastN(n: number): Promise<void> {
  keepLastN = Math.max(0, Math.floor(n));
  persistPolicy();
  if (loaded) await applyAutoDeletePolicy();
}

export function getTotalDownloadedBytes(): number {
  return records
    .filter(r => r.status === 'done')
    .reduce((sum, r) => sum + (r.size || 0), 0);
}

export const downloadService = {
  ensureLoaded,
  isLoaded,
  getRecords,
  getLocalPath,
  subscribe,
  startDownload,
  pauseDownload,
    resumeDownload,
  retryDownload,
  removeDownload,

  setKeepLastN,
  getKeepLastN,
  getTotalDownloadedBytes,
};

export default downloadService;
