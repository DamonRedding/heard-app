import { useEffect } from 'react';
import { Keyboard, KeyboardInfo } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to handle iOS keyboard behavior and ensure bottom navigation stays fixed
 * This works in conjunction with the Capacitor Keyboard plugin configuration
 */
export function useKeyboard() {
  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Ensure keyboard resize mode is set to 'none' for iOS
    // This prevents the WebView from resizing when keyboard appears
    if (Capacitor.getPlatform() === 'ios') {
      Keyboard.setResizeMode({ mode: 'none' }).catch((error) => {
        console.warn('Failed to set keyboard resize mode:', error);
      });
    }

    // Optional: Add keyboard event listeners for custom behavior
    const showListener = Keyboard.addListener('keyboardWillShow', (info: KeyboardInfo) => {
      // Custom logic when keyboard will show
      // The bottom navigation should remain fixed due to resize: 'none'
      console.debug('Keyboard will show, height:', info.keyboardHeight);
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      // Custom logic when keyboard will hide
      console.debug('Keyboard will hide');
    });

    // Cleanup listeners
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);
}

/**
 * Hook to get current keyboard height (useful for custom positioning)
 */
export function useKeyboardHeight() {
  // This can be expanded to track keyboard height dynamically if needed
  // For now, the resize: 'none' configuration handles our use case
  return 0;
}