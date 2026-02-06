import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
export const isIOS = platform === 'ios';
export const isAndroid = platform === 'android';
export const isWeb = platform === 'web';

export async function initNativePlugins() {
  if (!isNative) return;

  document.documentElement.classList.add('capacitor');
  if (isIOS) document.documentElement.classList.add('capacitor-ios');
  if (isAndroid) document.documentElement.classList.add('capacitor-android');

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });

    if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: '#0D5C63' });
    }
  } catch (e) {
    console.warn('StatusBar plugin not available:', e);
  }

  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-visible');
    });
  } catch (e) {
    console.warn('Keyboard plugin not available:', e);
  }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      }
    });
  } catch (e) {
    console.warn('App plugin not available:', e);
  }
}
