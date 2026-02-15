import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.heard.community',
  appName: 'Heard',
  webDir: 'dist/public',
  // Server configuration removed for production builds
  // The app will use the compiled assets from webDir
  // For development with live reload, uncomment the server block below:
  /*
  server: {
    androidScheme: 'https',
    url: 'http://localhost:5173',
    cleartext: true,
  },
  */
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
    Keyboard: {
      resize: 'none',
      style: 'dark',
    },
  },
};

export default config;
