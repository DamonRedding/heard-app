import { Capacitor } from '@capacitor/core';

/**
 * Fix for iOS WebView overscroll background color issue
 * This ensures the WebView background matches the app background color
 * to prevent black/gray gaps during overscroll on curved iPhone corners
 */
export async function fixIOSWebViewBackground() {
  if (Capacitor.getPlatform() === 'ios') {
    // Execute JavaScript to set WebView styles
    const script = `
      // Set document and body background to ensure full coverage
      document.documentElement.style.backgroundColor = '#f5f1e8';
      document.body.style.backgroundColor = '#f5f1e8';

      // Create a meta tag to set the theme color for better iOS integration
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.content = '#f5f1e8';
      }

      // For dark mode support
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.style.backgroundColor = '#0d1415';
        document.body.style.backgroundColor = '#0d1415';
        if (metaTheme) {
          metaTheme.content = '#0d1415';
        }
      }
    `;

    // Execute the script
    try {
      eval(script);
    } catch (error) {
      console.error('Failed to apply iOS WebView background fix:', error);
    }
  }
}