# Fix for iOS Viewport Coverage Gaps

## Issue Identified
When overscrolling on iOS, gaps appear:
- **Top/Bottom**: Beige/light background shows during overscroll
- **Right edge**: Gray line visible
- **Background doesn't extend**: App background color doesn't cover full viewport

## Root Causes

1. **Body padding for safe areas** (`index.css:377-382`):
   ```css
   html.capacitor body {
     padding-top: var(--safe-area-top);
     padding-bottom: var(--safe-area-bottom);
     padding-left: var(--safe-area-left);
     padding-right: var(--safe-area-right);
   }
   ```
   This creates gaps when overscrolling.

2. **Background on wrong element**: Background is on body, not html
3. **Missing viewport coverage during overscroll**

## Recommended Fix

### 1. Move background to html element and ensure full coverage:

```css
/* index.css - Add to @layer base */
html {
  @apply bg-background;
  /* Ensure full viewport coverage */
  min-height: 100vh;
  min-height: -webkit-fill-available;
}

body {
  /* Remove bg-background from here */
  @apply font-sans antialiased text-foreground;
  min-height: 100vh;
  min-height: -webkit-fill-available;
}
```

### 2. Fix safe area implementation:

```css
/* Better safe area approach that doesn't create gaps */
html.capacitor {
  /* Keep safe area vars */
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

html.capacitor body {
  /* Remove padding from body */
  padding: 0;
}

/* Apply safe areas to specific elements instead */
.pt-safe {
  padding-top: var(--safe-area-top);
}

.pb-safe {
  padding-bottom: var(--safe-area-bottom);
}
```

### 3. Update App.tsx layout structure:

```tsx
function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="sanctuary-voice-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <StoryReadsProvider>
            <div className="min-h-screen bg-background text-foreground flex flex-col">
              <div className="pt-safe flex-1 pb-16 md:pb-0">
                <Header />
                <Router />
              </div>
              <MobileNavigation />
            </div>
            <ShareFAB />
          </StoryReadsProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

### 4. Ensure navigation extends to screen edges:

```tsx
// mobile-navigation.tsx
<nav
  className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t"
  // Remove pb-safe from nav itself, apply to inner content
>
  <div className="flex items-center justify-around h-16 px-2 pb-safe">
    {/* nav items */}
  </div>
</nav>
```

### 5. Add overscroll color matching:

```css
/* Ensure overscroll areas match app background */
html {
  background-color: hsl(var(--background));
}

/* iOS specific */
@supports (-webkit-touch-callout: none) {
  body {
    /* Match overscroll color to background */
    background-color: hsl(var(--background));
  }
}
```

## Benefits
- No gaps during overscroll
- Background extends full viewport
- Navigation sits flush at bottom
- Safe areas still respected where needed
- Better iOS native feel

## Testing
1. Overscroll at top - should see app background color, not system color
2. Overscroll at bottom - navigation should remain flush
3. Check all device types (notch, no notch, home indicator)
4. Verify safe areas still work for content