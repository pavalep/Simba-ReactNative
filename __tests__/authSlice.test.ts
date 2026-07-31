import reducer, {
  AuthUser,
  AuthErrorKind,
  SESSION_TTL_MS,
  setLoading,
  setUser,
  setError,
  restoreStart,
  signOut,
  expireSession,
} from '../src/store/slices/authSlice';

const testUser: AuthUser = {
  id: 'u1',
  name: 'Tester',
  email: 'tester@simba.local',
  photo: null,
};

function makeState() {
  return reducer(undefined, {type: '@@INIT'});
}

describe('authSlice — 43.7 auth states', () => {
  it('starts signed-out and not restoring', () => {
    const s = makeState();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(s.isLoading).toBe(false);
    expect(s.isRestoring).toBe(false);
    expect(s.error).toBeNull();
    expect(s.errorKind).toBeNull();
    expect(s.sessionExpiresAt).toBeNull();
  });

  it('setUser authenticates and stamps session timestamps (43.2)', () => {
    const before = Date.now();
    const s = reducer(makeState(), setUser(testUser));
    expect(s.isAuthenticated).toBe(true);
    expect(s.user).toEqual(testUser);
    expect(s.error).toBeNull();
    expect(s.errorKind).toBeNull();
    expect(s.lastSignedInAt).not.toBeNull();
    expect(s.lastSignedInAt!).toBeGreaterThanOrEqual(before);
    expect(s.sessionExpiresAt).toBe(
      (s.lastSignedInAt ?? 0) + SESSION_TTL_MS,
    );
  });

  it('setUser(null) signs out and clears timestamps', () => {
    const s = reducer(
      reducer(makeState(), setUser(testUser)),
      setUser(null),
    );
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.lastSignedInAt).toBeNull();
    expect(s.sessionExpiresAt).toBeNull();
  });

  it('setError stores message + kind and stops loading/restoring (43.3)', () => {
    const s = reducer(
      reducer(
        reducer(makeState(), restoreStart()),
        setLoading(true),
      ),
      setError({message: 'offline', kind: 'offline' as AuthErrorKind}),
    );
    expect(s.error).toBe('offline');
    expect(s.errorKind).toBe('offline');
    expect(s.isLoading).toBe(false);
    expect(s.isRestoring).toBe(false);
  });

  it('restoreStart flags silent restore (43.1)', () => {
    const s = reducer(makeState(), restoreStart());
    expect(s.isRestoring).toBe(true);
  });

  it('expireSession drops the session with a re-auth error (43.2)', () => {
    const s = reducer(
      reducer(makeState(), setUser(testUser)),
      expireSession(),
    );
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(s.errorKind).toBe('session_expired');
    expect(s.error).toContain('expired');
    expect(s.sessionExpiresAt).toBeNull();
  });

  it('signOut resets everything', () => {
    const s = reducer(
      reducer(reducer(makeState(), setUser(testUser)), setError({message: 'x', kind: 'unknown'})),
      signOut(),
    );
    expect(s).toEqual({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isRestoring: false,
      error: null,
      errorKind: null,
      lastSignedInAt: null,
      sessionExpiresAt: null,
    });
  });
});
