import {useState, useEffect} from 'react';
import {Keyboard, KeyboardEvent} from 'react-native';

/**
 * What the app knows about the keyboard.
 *
 * `keyboardTop` is the keyboard's TOP edge in SCREEN coordinates (dp),
 * and it is the number that matters:
 *
 *   • a window that does NOT resize behind the keyboard (iOS, and
 *     Android from API 35, where edge-to-edge is enforced and
 *     `adjustResize` is ignored) keeps its full height, so a control
 *     anchored to the window's bottom edge is UNDER the keyboard;
 *   • a window that DOES resize (older Android) gives up the room
 *     itself, and its bottom edge IS the keyboard's top edge.
 *
 * One number for both: the distance from the window's bottom edge down
 * to the keyboard's top edge is what a control has to clear.
 */
export interface KeyboardState {
  keyboardVisible: boolean;
  /** The keyboard's height (dp). */
  keyboardHeight: number;
  /** The keyboard's TOP edge in screen coordinates (dp). */
  keyboardTop: number;
}

export function useKeyboard(): KeyboardState {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardTop, setKeyboardTop] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardTop(e.endCoordinates.screenY);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      setKeyboardTop(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return {keyboardVisible, keyboardHeight, keyboardTop};
}
