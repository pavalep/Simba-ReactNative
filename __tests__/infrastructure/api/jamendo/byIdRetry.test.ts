/**
 * The by-id lookup's empty answer is a DECLINED answer, not a "no".
 *
 * ## What this pins
 *
 * Jamendo's by-id endpoint answers with an EMPTY SUCCESS envelope on
 * roughly half the requests. MEASURED 2026-11-19 on the live API:
 * `GET /v3.0/tracks/?id=1932670` came back HTTP 200 with
 * `headers.status = "success"`, `code = 0`, `error_message = ""` and an
 * empty `results` array on eight identical requests in the pattern
 * 1,1,1,1,0,0,1,0 — and a second twelve-request run missed once more.
 * The track exists; the endpoint simply declined to answer that time.
 *
 * The consequence on device: the Music detail screen showed
 * "Track not found" for the track the user had just tapped. Reproduced
 * on emulator-5554 by tapping "RED LIGHT, Egor Budennyy" (id 1932670).
 *
 * The LIST path already knew this — `fetchTracksWithRetry` repeats a
 * request whose empty page is not an answer. The by-id path did not, so
 * one declined answer became `null`.
 *
 * ## Why the list path's rule cannot be reused
 *
 * The list path asks the envelope whether the empty page IS the answer
 * (`headers.results_count`). The DECLINED by-id answers carry
 * `results_count: 0` too, so that rule would call every empty "an
 * answer" and the retry would never run. For a by-id lookup the id is
 * already known-good — it came from a list that showed the track — so
 * an empty is never an answer.
 *
 * ## What stays the same
 *
 * A wire-shape failure (`AdapterParseError`) still propagates on the
 * FIRST attempt: the server answered with something the adapter cannot
 * read, and the caller must see that. A transport failure is still
 * swallowed into `null`, but it is retried first — a dropped connection
 * and a declined request both mean "not right now", not "no".
 */

import {getJamendoTrackById} from '../../../../src/infrastructure/api/jamendo/adapter';
import {AdapterParseError} from '../../../../src/infrastructure/api/adapterErrors';

jest.mock('../../../../src/infrastructure/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));
const {apiFetch} = require('../../../../src/infrastructure/api/apiClient');
const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

jest.mock('react-native-config', () => ({
  JAMENDO_CLIENT_ID: 'test-client-id',
}));

/** A SUCCESS envelope with no rows — the declined answer. */
function declinedEnvelope() {
  return {
    headers: {status: 'success' as const, code: 0, results_count: 0},
    results: [],
  };
}

/** A SUCCESS envelope carrying one track. */
function answeredEnvelope(id = 1932670) {
  return {
    headers: {status: 'success' as const, code: 0, results_count: 1},
    results: [
      {
        id: String(id),
        name: 'RED LIGHT',
        artist_name: 'Egor Budennyy',
        album_name: 'Album',
        duration: 180,
        audio: 'https://example.com/audio.mp3',
        image: 'https://example.com/image.jpg',
      },
    ],
  };
}

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe('the Jamendo by-id lookup retries a declined answer', () => {
  it('answers the track after one declined answer', async () => {
    mockedApiFetch
      .mockResolvedValueOnce(declinedEnvelope())
      .mockResolvedValueOnce(answeredEnvelope());

    const result = await getJamendoTrackById(1932670);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(1932670);
    // One declined answer, one answer. It stops there.
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
  });

  it('answers the track after a run of declines that fits inside the budget', async () => {
    // The measured pattern was 1,1,1,1,0,0,1,0 — a decline can come back
    // to back. Three declines still leave an attempt inside the budget.
    mockedApiFetch
      .mockResolvedValueOnce(declinedEnvelope())
      .mockResolvedValueOnce(declinedEnvelope())
      .mockResolvedValueOnce(declinedEnvelope())
      .mockResolvedValueOnce(answeredEnvelope());

    const result = await getJamendoTrackById(1932670);

    expect(result?.id).toBe(1932670);
    expect(mockedApiFetch).toHaveBeenCalledTimes(4);
  });

  it('asks at most four times and then answers null', async () => {
    mockedApiFetch.mockResolvedValue(declinedEnvelope());

    const result = await getJamendoTrackById(1932670);

    expect(result).toBeNull();
    // The budget is bounded: four attempts, then the honest "no".
    expect(mockedApiFetch).toHaveBeenCalledTimes(4);
  });

  it('asks again after a transport failure', async () => {
    mockedApiFetch
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce(answeredEnvelope());

    const result = await getJamendoTrackById(1932670);

    expect(result?.id).toBe(1932670);
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
  });

  it('answers null when every attempt fails in transport', async () => {
    mockedApiFetch.mockRejectedValue(new Error('Network request failed'));

    const result = await getJamendoTrackById(1932670);

    expect(result).toBeNull();
    expect(mockedApiFetch).toHaveBeenCalledTimes(4);
  });

  it('propagates a wire-shape failure on the FIRST attempt', async () => {
    // A shape failure is not a decline — the server answered with
    // something the adapter cannot read, and the caller must see it.
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'error', code: 10, error_message: 'invalid client_id'},
      results: [],
    });

    await expect(getJamendoTrackById(1)).rejects.toBeInstanceOf(
      AdapterParseError,
    );
    // No retry: the failure is deterministic.
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
  });

  it('does not spend a request when the screen has already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await getJamendoTrackById(1932670, controller.signal);

    expect(result).toBeNull();
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it('threads the AbortSignal on every attempt', async () => {
    mockedApiFetch.mockResolvedValue(declinedEnvelope());
    const controller = new AbortController();

    await getJamendoTrackById(1932670, controller.signal);

    expect(mockedApiFetch).toHaveBeenCalledTimes(4);
    for (const call of mockedApiFetch.mock.calls) {
      expect(call[0]).toEqual(
        expect.objectContaining({signal: controller.signal}),
      );
    }
  });
});
