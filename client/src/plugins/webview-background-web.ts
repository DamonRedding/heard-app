import { WebPlugin } from '@capacitor/core';
import type { WebViewBackgroundPlugin } from './webview-background';

export class WebViewBackgroundWeb extends WebPlugin implements WebViewBackgroundPlugin {
  async setBackgroundColor(options: { color: string; isDarkMode?: boolean }): Promise<void> {
    // Web implementation - just update CSS variable
    document.documentElement.style.setProperty('--webview-background', options.color);
  }

  async updateForTheme(options: { isDarkMode: boolean }): Promise<void> {
    // Web implementation - no-op since CSS handles theme changes
    console.log('Theme update requested:', options.isDarkMode ? 'dark' : 'light');
  }
}