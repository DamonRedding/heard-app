# iOS Keyboard Handling Implementation

## Problem Statement
On iOS devices, when a text input field is focused and the keyboard appears, the default behavior is for the WebView to resize, which pushes up fixed-positioned elements like the bottom navigation bar. This creates a poor user experience where the navigation bar floats above the keyboard instead of remaining fixed at the bottom of the screen.

## Solution Overview
We've implemented a solution using Capacitor's Keyboard plugin with the `resize: 'none'` configuration, which prevents the WebView from resizing when the keyboard appears. This keeps the bottom navigation fixed in its original position behind the keyboard.

## Implementation Details

### 1. Capacitor Configuration
In `capacitor.config.ts`, we've added the Keyboard plugin configuration:

```typescript
plugins: {
  Keyboard: {
    resize: 'none',  // Prevents WebView resize on iOS
    style: 'dark',   // Matches app theme
  },
}
```

### 2. Keyboard Hook
Created `client/src/hooks/use-keyboard.ts` to handle keyboard events and ensure proper behavior:

```typescript
export function useKeyboard() {
  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      // Programmatically ensure resize mode is set
      Keyboard.setResizeMode({ mode: 'none' });
    }

    // Optional keyboard event listeners for custom behavior
    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      // Custom logic when keyboard appears
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      // Custom logic when keyboard hides
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);
}
```

### 3. App Integration
The keyboard hook is integrated in `App.tsx`:

```typescript
function AppContent() {
  useWebViewBackground();
  useKeyboard(); // Initialize keyboard handling

  return (
    // App content
  );
}
```

### 4. CSS Considerations
The mobile navigation component (`mobile-navigation.tsx`) uses:
- `position: fixed`
- `bottom: 0`
- `z-index: 50` (to ensure it stays above content)
- Safe area inset handling for devices with home indicators

## How It Works

1. **Without the fix**: iOS WebView shrinks when keyboard appears → Fixed elements move up with the viewport
2. **With the fix**: WebView maintains its size → Fixed elements stay in original position → Keyboard overlays the content

## Testing

### Manual Testing
1. Open the app on an iOS device
2. Navigate to any screen with text input (Search, Settings)
3. Tap on an input field
4. Verify that:
   - Keyboard appears
   - Bottom navigation stays at the bottom (behind keyboard)
   - Content above keyboard is scrollable
   - Navigation remains accessible after dismissing keyboard

### Automated Testing
Run the Maestro test: `maestro test .maestro/test-ios-keyboard-navigation.yaml`

This test verifies:
- Navigation position before/after keyboard appearance
- Navigation visibility during keyboard interactions
- Proper behavior across different screens

## Platform Differences

### iOS
- Uses `resize: 'none'` to prevent WebView resizing
- Keyboard overlays content
- Bottom navigation stays fixed

### Android
- Default behavior typically works correctly
- May need `resizeOnFullScreen: true` for edge cases
- Configuration already supports both platforms

## Troubleshooting

### Issue: Navigation still moves up
1. Ensure Capacitor sync has been run: `npm run capacitor:sync:ios`
2. Verify the Keyboard plugin is installed: `@capacitor/keyboard`
3. Check that `useKeyboard()` hook is being called in App component

### Issue: Content not accessible behind keyboard
- This is expected behavior with `resize: 'none'`
- Ensure important inputs are positioned higher in the viewport
- Consider using scroll-to-focus behavior for better UX

### Issue: Keyboard style doesn't match app theme
- Update `style` property in Keyboard configuration
- Options: 'light' | 'dark' | 'default'

## Future Enhancements

1. **Dynamic keyboard height tracking**: Use `keyboardHeight` from events to adjust content padding dynamically
2. **Scroll-to-focus**: Auto-scroll focused inputs into view above keyboard
3. **Input accessory view**: Add toolbar above keyboard for better navigation
4. **Conditional resize modes**: Different behavior for specific screens if needed

## References
- [Capacitor Keyboard Plugin Docs](https://capacitorjs.com/docs/apis/keyboard)
- [iOS Keyboard Management Best Practices](https://developer.apple.com/design/human-interface-guidelines/ios/views/keyboards/)
- [WebView Viewport Handling](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)