import {useState, useEffect} from 'react';

interface NetworkStatus {
  isOnline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Try @react-native-community/netinfo first
    let unsubscribe: (() => void) | null = null;

    try {
      const NetInfo = require('@react-native-community/netinfo');
      unsubscribe = NetInfo.addEventListener((state: {isConnected: boolean}) => {
        setIsOnline(state.isConnected ?? true);
      });
    } catch {
      // React Native doesn't have navigator/window — assume online
      setIsOnline(true);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return {isOnline};
}
