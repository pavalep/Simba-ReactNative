import {useState, useEffect} from 'react';
import {Keyboard, KeyboardEvent} from 'react-native';

export function useKeyboard(): {keyboardVisible: boolean; keyboardHeight: number} {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return {keyboardVisible, keyboardHeight};
}
