import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { getEnvDiagnostics } from '../src/config/env';
import { logger } from '../src/services/logger';

export default function RootLayout() {
  useEffect(() => {
    if (__DEV__) {
      logger.info('env', 'Credential diagnostics', getEnvDiagnostics());
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary scope="RootLayout" fallbackTitle="App recovered">
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="home" />
          <Stack.Screen name="session" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="streak" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
