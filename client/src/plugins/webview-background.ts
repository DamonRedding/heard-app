import { registerPlugin } from '@capacitor/core';

export interface WebViewBackgroundPlugin {
  setBackgroundColor(options: { color: string; isDarkMode?: boolean }): Promise<void>;
  updateForTheme(options: { isDarkMode: boolean }): Promise<void>;
}

const WebViewBackground = registerPlugin<WebViewBackgroundPlugin>('WebViewBackground', {
  web: () => import('./webview-background-web').then(m => new m.WebViewBackgroundWeb())
});

export { WebViewBackground };