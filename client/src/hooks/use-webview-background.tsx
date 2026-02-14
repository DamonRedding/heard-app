import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { WebViewBackground } from '@/plugins/webview-background';
import { useTheme } from '@/components/theme-provider';

export function useWebViewBackground() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return;
    }

    // Determine if dark mode
    const isDarkMode = theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Update WebView background
    WebViewBackground.updateForTheme({ isDarkMode })
      .catch(err => console.error('Failed to update WebView background:', err));
  }, [theme]);

  // Also listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios' || theme !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      WebViewBackground.updateForTheme({ isDarkMode: e.matches })
        .catch(err => console.error('Failed to update WebView background:', err));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Initial setup on mount
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return;
    }

    // Set initial background color
    const isDarkMode = theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const color = isDarkMode ? '#0D1214' : '#F5F1E8';
    WebViewBackground.setBackgroundColor({ color, isDarkMode })
      .catch(err => console.error('Failed to set WebView background:', err));
  }, []);
}