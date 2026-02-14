import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.heard.community',
  appName: 'Heard',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    backgroundColor: '#F5F1E8', // Light mode background - matches --background
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0D5C63',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#0D5C63',
      overlaysWebView: false,
    },
  },
};

export default config;
