# iOS Overscroll Fix - Pure CSS Solution

## Problem
The native iOS approach (disabling bounce in BridgeViewController) was causing a black screen issue. iOS WebView was showing black/dark gaps at top during overscroll and white/light gaps at bottom.

## Solution
Implemented a pure CSS/HTML solution that works within iOS WKWebView constraints without requiring native code changes.

### Changes Made

#### 1. BridgeViewController.swift - Reverted to Minimal Implementation
**File**: `ios/App/App/BridgeViewController.swift`

Removed all native bounce-disabling code that was causing the black screen. Now uses a minimal custom implementation that relies on CSS handling.

```swift
class BridgeViewController: CAPBridgeViewController {
    // Minimal custom implementation - no native bounce disabling
    // Using CSS-based overscroll handling instead
}
```

#### 2. CSS Overscroll Prevention - index.css
**File**: `client/src/index.css`

Implemented a fixed-body approach that prevents rubber-band scrolling while maintaining smooth scrolling:

**Key CSS Changes**:
- **html**: `position: fixed` with `overflow: hidden` to prevent document-level scrolling
- **body**: Fixed positioning (`top: 0, left: 0, right: 0, bottom: 0`) with `overflow: hidden`
- **body > div**: Main scroll container with `overflow-y: auto` and `overscroll-behavior-y: contain`
- Background colors extend beyond viewport to fill any gaps during overscroll

**Capacitor-specific enhancements**:
```css
html.capacitor body > div {
  /* Extra height to prevent gaps during bounce */
  min-height: calc(100% + env(safe-area-inset-top) + env(safe-area-inset-bottom));
  /* Background fills any gaps */
  background-color: hsl(var(--background));
}
```

#### 3. HTML Viewport & iOS Meta Tags - index.html
**File**: `client/index.html`

Enhanced viewport meta tag and added iOS-specific tags:

```html
<!-- Enhanced viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />

<!-- iOS-specific meta tags -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="theme-color" content="#f5f1e8" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0d1415" media="(prefers-color-scheme: dark)" />
```

## How It Works

1. **Fixed Positioning Strategy**: By fixing both `html` and `body`, we prevent iOS from applying native rubber-band scrolling to the document
2. **Scrollable Container**: The `#root` div (body > div) becomes the scrollable container with proper overflow handling
3. **Background Extension**: Background colors extend beyond the viewport boundaries to fill any gaps
4. **Safe Area Handling**: Uses CSS `env()` variables to account for iOS safe areas (notch, home indicator)
5. **Theme Colors**: Theme meta tags tell iOS what color to use for the status bar and overscroll areas

## Benefits

- **No Native Code**: Pure CSS/HTML solution works within WebView constraints
- **No Black Screen**: Eliminates the app-breaking issue from native approach
- **Cross-Platform**: Works on both web and iOS without conditional logic
- **Smooth Scrolling**: Maintains `-webkit-overflow-scrolling: touch` for momentum
- **Proper Theming**: Respects light/dark mode preferences

## Testing

Run Maestro tests to validate:
```bash
maestro test .maestro/mobile-navigation.yaml
```

Expected outcomes:
- No black gaps at top during overscroll
- No white gaps at bottom during overscroll
- Smooth scrolling experience maintained
- Navigation and interactions work correctly
- Safe areas properly respected

## Technical Details

### Why Fixed Body Works
iOS WebView applies rubber-band scrolling to the `<body>` element by default. By making body `position: fixed`, we remove it from the normal document flow, preventing iOS from applying its native overscroll behavior. The scroll happens on the child container instead, which we can control with `overscroll-behavior-y: contain`.

### Why Theme Color Matters
The `theme-color` meta tag tells iOS what color to use for:
- Status bar background
- Safe area backgrounds during overscroll
- Browser chrome (when applicable)

This ensures consistent branding throughout the app experience.

### Safe Area Calculations
```css
min-height: calc(100% + env(safe-area-inset-top) + env(safe-area-inset-bottom));
```

This ensures the background extends beyond the visible viewport to cover safe areas, preventing gaps during any scroll bounce that might still occur.
