/**
 * Structured error logging to local storage.
 * Stores the last N error events with timestamps for debugging.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@simba/error_log';
const MAX_LOG_ENTRIES = 50;

export interface ErrorLogEntry {
  timestamp: string;
  code: string;
  message: string;
  detail?: string;
  source?: string;
}

/**
 * Append an error entry to the local error log.
 */
export async function logError(entry: Omit<ErrorLogEntry, 'timestamp'>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const log: ErrorLogEntry[] = raw ? JSON.parse(raw) : [];
    log.push({...entry, timestamp: new Date().toISOString()});
    // Keep only the last N entries
    if (log.length > MAX_LOG_ENTRIES) {
      log.splice(0, log.length - MAX_LOG_ENTRIES);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Silently fail — logging should never throw
  }
}

/**
 * Retrieve all stored error log entries (newest last).
 */
export async function getErrorLog(): Promise<ErrorLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear the entire error log.
 */
export async function clearErrorLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
