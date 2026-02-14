import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.heard.community',
  appName: 'Heard',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
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
