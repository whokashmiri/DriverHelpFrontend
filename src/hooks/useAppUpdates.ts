
import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

export function useAppUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    let isMounted = true;

    async function checkForUpdates() {
      try {
        const result = await Updates.checkForUpdateAsync();

        if (!isMounted || !result.isAvailable) {
          return;
        }

        Alert.alert(
          'Update available',
          'A new version is ready. Update now for the latest improvements.',
          [
            {
              text: 'Later',
              style: 'cancel',
            },
            {
              text: 'Update now',
              onPress: () => {
                void downloadAndApplyUpdate();
              },
            },
          ],
          { cancelable: true },
        );
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    }

    async function downloadAndApplyUpdate() {
      try {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch (error) {
        console.error('Failed to apply update:', error);
        Alert.alert(
          'Update failed',
          'Please try again later.',
        );
      }
    }

    void checkForUpdates();

    return () => {
      isMounted = false;
    };
  }, []);
}
