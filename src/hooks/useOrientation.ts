import {useState, useEffect} from 'react';
import {Dimensions} from 'react-native';

export type Orientation = 'portrait' | 'landscape';

export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  useEffect(() => {
    const update = () => {
      const {width, height} = Dimensions.get('window');
      setOrientation(width > height ? 'landscape' : 'portrait');
    };
    update();
    const sub = Dimensions.addEventListener('change', update);
    return () => sub.remove();
  }, []);

  return orientation;
}
