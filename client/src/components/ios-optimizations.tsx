import { useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard, KeyboardInfo } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

interface IOSOptimizationsProps {
  children: React.ReactNode;
}

/**
 * iOS Optimizations Component
 *
 * Handles all iOS-specific optimizations and features:
 * - Haptic feedback on interactions
 * - Keyboard management
 * - Status bar styling
 * - App lifecycle events
 * - Safe area handling
 */
export function IOSOptimizations({ children }: IOSOptimizationsProps) {
  useEffect(() => {
    // Initialize iOS features
    initializeStatusBar();
    setupKeyboardHandling();
    setupAppLifecycle();
    setupHapticFeedback();

    // Cleanup
    return () => {
      removeHapticListeners();
    };
  }, []);

  const initializeStatusBar = async () => {
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#0D5C63' });
    } catch (error) {
      console.warn('StatusBar setup failed:', error);
    }
  };

  const setupKeyboardHandling = () => {
    // Listen for keyboard events
    Keyboard.addListener('keyboardWillShow', (info: KeyboardInfo) => {
      console.log('Keyboard will show, height:', info.keyboardHeight);
      // Add padding to prevent content being hidden
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${info.keyboardHeight}px`
      );
    });

    Keyboard.addListener('keyboardWillHide', () => {
      console.log('Keyboard will hide');
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    });
  };

  const setupAppLifecycle = () => {
    // Handle app state changes
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Active:', isActive);
      if (isActive) {
        // App resumed - refresh data if needed
        refreshDataIfNeeded();
      }
    });

    // Handle app URL open (deep links)
    App.addListener('appUrlOpen', ({ url }) => {
      console.log('App opened with URL:', url);
      // Handle deep links here
    });
  };

  const setupHapticFeedback = () => {
    // Add haptic feedback to all interactive elements
    document.addEventListener('click', handleHapticFeedback, true);
  };

  const removeHapticListeners = () => {
    document.removeEventListener('click', handleHapticFeedback, true);
  };

  const handleHapticFeedback = async (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    // Determine haptic style based on element
    if (target.closest('button, .button')) {
      await triggerHaptic(ImpactStyle.Light);
    } else if (target.closest('a, .link')) {
      await triggerHaptic(ImpactStyle.Light);
    } else if (target.closest('.card, .submission-card')) {
      await triggerHaptic(ImpactStyle.Light);
    } else if (target.closest('.reaction-button')) {
      await triggerHaptic(ImpactStyle.Medium);
    } else if (target.closest('.vote-button')) {
      await triggerHaptic(ImpactStyle.Medium);
    }
  };

  const triggerHaptic = async (style: ImpactStyle) => {
    try {
      await Haptics.impact({ style });
    } catch (error) {
      // Haptics not available (simulator or web)
    }
  };

  const refreshDataIfNeeded = () => {
    // Check if data is stale (e.g., app was in background for > 5 minutes)
    const lastRefresh = sessionStorage.getItem('lastDataRefresh');
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    if (!lastRefresh || parseInt(lastRefresh) < fiveMinutesAgo) {
      // Trigger a data refresh
      window.dispatchEvent(new CustomEvent('app:refresh-data'));
      sessionStorage.setItem('lastDataRefresh', Date.now().toString());
    }
  };

  return (
    <>
      {/* iOS-specific styles */}
      <style jsx global>{`
        /* Prevent overscroll bounce */
        body {
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
        }

        /* Safe area handling */
        .ios-safe-top {
          padding-top: env(safe-area-inset-top);
        }

        .ios-safe-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }

        /* Keyboard offset */
        .keyboard-aware {
          padding-bottom: var(--keyboard-height, 0);
          transition: padding-bottom 0.3s ease;
        }

        /* Tap highlight removal */
        * {
          -webkit-tap-highlight-color: transparent;
        }

        /* iOS-specific scrollbar hiding */
        ::-webkit-scrollbar {
          display: none;
        }

        /* Smooth scrolling */
        .scroll-container {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        /* Pull-to-refresh indicator */
        .ptr-element {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          color: #999;
          z-index: 10;
          text-align: center;
          height: 80px;
        }

        /* iOS rubber band effect for custom scroll */
        .ios-scroll {
          -webkit-overflow-scrolling: touch;
          overflow-y: scroll;
        }

        /* Prevent text selection on interactive elements */
        button, .button, .card {
          -webkit-user-select: none;
          user-select: none;
        }

        /* iOS form input styling */
        input, textarea {
          -webkit-appearance: none;
          appearance: none;
          font-size: 16px; /* Prevents zoom on focus */
        }

        /* Fixed positioning adjustments for iOS */
        .ios-fixed-bottom {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
      {children}
    </>
  );
}

// Utility hooks for iOS features
export function useHaptic() {
  const light = () => Haptics.impact({ style: ImpactStyle.Light });
  const medium = () => Haptics.impact({ style: ImpactStyle.Medium });
  const heavy = () => Haptics.impact({ style: ImpactStyle.Heavy });
  const success = () => Haptics.notification({ type: 'success' });
  const warning = () => Haptics.notification({ type: 'warning' });
  const error = () => Haptics.notification({ type: 'error' });

  return { light, medium, heavy, success, warning, error };
}

export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      setHeight(info.keyboardHeight);
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return height;
}