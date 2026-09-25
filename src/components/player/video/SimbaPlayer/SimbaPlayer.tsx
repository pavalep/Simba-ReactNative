/**
 * V19 W0 Phase 0.5 — `SimbaPlayer` (STUB).
 *
 * W0: returns `null`. The forwardRef + useImperativeHandle wiring is
 * in place so Wave 4 can fill in the chrome composition without
 * changing the public shape.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3 + §5 + audit doc §4.
 *
 * Migration note (audit §5): the V16 lib also exports a `SimbaPlayer`
 * (the root with `resumePolicy`). V19's NEW `SimbaPlayer` REPLACES
 * the V16 root in W4 — when V19 has chrome primitives ready to
 * render. Until then, both coexist; consumers keep using the V16
 * root.
 */

import {forwardRef, useImperativeHandle} from 'react';
import type {SimbaPlayerProps, SimbaPlayerRef} from './types';

export type {SimbaPlayerProps, SimbaPlayerRef, VideoSource} from './types';

/**
 * SimbaPlayer — the V19 chrome. Always-mounted at the App.tsx shell
 * (W4+). W0 stub returns `null`.
 */
export const SimbaPlayer = forwardRef<SimbaPlayerRef, SimbaPlayerProps>(
  // The function is named (rather than anonymous) so React DevTools
  // shows `SimbaPlayer` for the component. The inner name shadows
  // the outer const, which is intentional — that's why the warning
  // is suppressed for this file.
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function SimbaPlayer(_props, ref) {
    useImperativeHandle(
      ref,
      () =>
        // W0: empty imperative surface. Wave 4 fills this in.
        // The shape MUST match `SimbaPlayerRef` (SPEC §5.3) so consumers
        // can be written against the contract today. The `unknown` cast
        // forces a compile error if any consumer tries to call a
        // method that doesn't exist in W0; Wave 4 replaces this with
        // a full implementation.
        ({}) as unknown as SimbaPlayerRef,
      [],
    );

    return null;
  },
);

export default SimbaPlayer;
