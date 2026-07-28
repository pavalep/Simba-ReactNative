import {useState, useEffect, useRef} from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasEverOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const wasEverOffline = useRef(false);

  useEffect(() => {
    // Try @react-native-community/netinfo first
    let unsubscribe: (() => void) | null = null;

    try {
      const NetInfo = require('@react-native-community/netinfo');
      unsubscribe = NetInfo.addEventListener((state: {isConnected: boolean}) => {
        const online = state.isConnected ?? true;
        setIsOnline(online);
        if (!online) wasEverOffline.current = true;
      });
    } catch {
      // React Native doesn't have navigator/window — assume online
      setIsOnline(true);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return {isOnline, wasEverOffline: wasEverOffline.current};
}
