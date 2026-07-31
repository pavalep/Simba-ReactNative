import {classifyAuthError} from '../src/services/authService';

// Fake statusCodes mirroring the native module constants (v13 API).
const fakeCodes = {
  SIGN_IN_CANCELLED: -5,
  IN_PROGRESS: -4,
  PLAY_SERVICES_NOT_AVAILABLE: -3,
  SIGN_IN_REQUIRED: -2,
};

describe('classifyAuthError — 43.3 error states', () => {
  it('classifies cancellation by code', () => {
    const info = classifyAuthError(
      {code: fakeCodes.SIGN_IN_CANCELLED, message: 'The user cancelled'},
      fakeCodes,
    );
    expect(info.kind).toBe('cancelled');
  });

  it('classifies missing Play Services by code', () => {
    const info = classifyAuthError(
      {code: fakeCodes.PLAY_SERVICES_NOT_AVAILABLE, message: 'no ps'},
      fakeCodes,
    );
    expect(info.kind).toBe('play_services');
  });

  it('classifies revoked/expired credential by code', () => {
    const info = classifyAuthError(
      {code: fakeCodes.SIGN_IN_REQUIRED, message: 'sign-in required'},
      fakeCodes,
    );
    expect(info.kind).toBe('session_expired');
  });

  it('classifies offline by message heuristics', () => {
    expect(
      classifyAuthError(new Error('Network Error: connection refused'), fakeCodes).kind,
    ).toBe('offline');
    expect(
      classifyAuthError(new Error('Unable to reach the internet'), fakeCodes).kind,
    ).toBe('offline');
  });

  it('falls back to unknown with a friendly message', () => {
    const info = classifyAuthError(new Error('Something exploded'), fakeCodes);
    expect(info.kind).toBe('unknown');
    expect(info.message).toBe('Something exploded');
  });

  it('handles non-Error throwables', () => {
    const info = classifyAuthError('boom', fakeCodes);
    expect(info.kind).toBe('unknown');
    expect(info.message.length).toBeGreaterThan(0);
  });
});
