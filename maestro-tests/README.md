# Maestro iOS UX Test Suite for Heard App

Comprehensive mobile UX testing suite for the Heard iOS app (anonymous church experience sharing platform).

## Prerequisites

1. **Maestro CLI**: [Installation Guide](https://maestro.mobile.dev/getting-started/installing-maestro)
```bash
brew install maestro
```

2. **iOS Simulator** or **Physical iOS Device**

3. **App Built and Installed**:
```bash
# Build the app
npm run build

# Sync Capacitor
npx cap sync ios

# Open Xcode
npx cap open ios

# Build and install on simulator/device
```

## Test Suite Overview

| Test | Priority | Status | Description |
|------|----------|--------|-------------|
| 01-navigation-visibility | P0 | **FAILING** | Navigation hides on scroll (iOS HIG violation) |
| 02-touch-target-sizes | P0 | **PARTIAL** | Some buttons undersized |
| 03-fab-positioning | P0 | **FAILING** | FAB too close to navigation (16px gap, need 32px) |
| 04-user-flow-vote | P1 | **PASSING** | Vote buttons work, missing haptics |
| 05-user-flow-submit | P1 | **PASSING** | Submit flow works |
| 06-navigation-context | P1 | **PARTIAL** | FAB context works, nav hides on scroll |
| 07-accessibility | P1 | **MANUAL** | Requires VoiceOver and manual verification |
| 08-performance | P2 | **MANUAL** | Requires frame rate monitoring |
| 09-safe-area | P1 | **PARTIAL** | Nav has safe area, FAB doesn't |

## Running Tests

### Run All Tests
```bash
cd /path/to/heard-app
maestro test maestro-tests/
```

### Run Single Test
```bash
maestro test maestro-tests/01-navigation-visibility.yaml
```

### Run on Specific Device
```bash
# List available devices
xcrun simctl list devices

# Run on specific device
maestro test --device "iPhone 15 Pro Max" maestro-tests/01-navigation-visibility.yaml
```

### Run with Screenshots
```bash
mkdir -p maestro-screenshots
maestro test --format junit --output maestro-screenshots/ maestro-tests/
```

## Known Issues (P0 - Critical)

### 1. Navigation Visibility Violation ❌
**File**: `client/src/components/mobile-navigation.tsx:32`
**Issue**: Navigation hides when scrolling down using `translate-y-full`
**iOS HIG**: Tab bars must remain visible during navigation
**Impact**: Users lose context and can't navigate when scrolled
**Fix Required**: Remove scroll-based hiding behavior

```tsx
// Current (WRONG):
className={cn(
  "fixed bottom-0 ...",
  isVisible ? "translate-y-0" : "translate-y-full"  // ❌ Hides nav
)}

// Recommended (CORRECT):
className="fixed bottom-0 ..."  // ✅ Always visible
```

### 2. FAB Positioning Too Close ⚠️
**File**: `client/src/components/share-fab.tsx:56`
**Issue**: FAB is 16px from navigation (need ≥32px)
**Current**: `bottom: '5rem'` (80px), Nav height: 64px, Gap: 16px
**iOS HIG**: Minimum 32px gap to prevent accidental taps
**Impact**: Users accidentally tap FAB when aiming for nav
**Fix Required**: Increase bottom spacing

```tsx
// Current (TOO CLOSE):
style={{
  bottom: '5rem',  // 80px - 64px = 16px gap ❌
}}

// Recommended (PROPER SPACING):
style={{
  bottom: 'calc(4rem + 2rem)',  // 64px nav + 32px gap = 96px ✅
}}
```

### 3. "Read More" Button Undersized ⚠️
**File**: `client/src/components/submission-card.tsx:288-290`
**Issue**: No explicit height, likely <44pt
**iOS HIG**: Minimum 44x44pt touch targets
**Impact**: Users struggle to tap, especially with larger fingers
**Fix Required**: Add minimum height

```tsx
// Current (UNDERSIZED):
<button
  className="inline-flex items-center gap-1 mt-2 text-sm ..."  // ❌ No min-height
>

// Recommended (PROPER SIZE):
<button
  className="inline-flex items-center gap-1 mt-2 text-sm min-h-[44px] px-3 ..."  // ✅ 44pt touch target
>
```

### 4. Missing Haptic Feedback ⚠️
**Files**: `client/src/components/vote-buttons.tsx`
**Issue**: Capacitor Haptics plugin installed but not used
**Impact**: No tactile feedback for vote actions
**Fix Required**: Implement haptics

```tsx
// Current (NO HAPTICS):
const handleVote = (voteType: VoteType) => {
  // ... vote logic
  onVote(voteType);
};

// Recommended (WITH HAPTICS):
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const handleVote = async (voteType: VoteType) => {
  // Haptic feedback for better UX
  await Haptics.impact({ style: ImpactStyle.Medium });

  // ... vote logic
  onVote(voteType);
};
```

### 5. FAB Missing Safe Area Support ⚠️
**File**: `client/src/components/share-fab.tsx:56`
**Issue**: Fixed positioning without safe area consideration
**Impact**: FAB may be obscured by home indicator on newer iPhones
**Fix Required**: Use safe area insets

```tsx
// Current (NO SAFE AREA):
style={{
  bottom: '5rem',
}}

// Recommended (WITH SAFE AREA):
style={{
  bottom: 'calc(5rem + env(safe-area-inset-bottom))',
}}
```

## Test Reporting Format

Each test generates screenshots and console output. Expected format:

```
### Test: Navigation Visibility

**Status**: ❌ FAIL

**Measurements**:
- Navigation visibility on scroll: HIDDEN (Expected: VISIBLE)
- Scroll distance before hide: 150px (Expected: Never hide)

**Screenshots**:
- nav-after-scroll-down.png
- nav-after-scroll-up.png
- nav-final-state.png

**Issues Found**:
1. Navigation hides when scrolling down - Severity: P0
   - Location: client/src/components/mobile-navigation.tsx:32
   - Expected: Navigation remains visible during all scrolling
   - Actual: Navigation translates out of view (translate-y-full)
   - Fix: Remove isVisible condition, keep navigation always visible

**User Impact**: Users cannot navigate when scrolled down, violating iOS HIG and causing confusion.
```

## Manual Verification Checklist

Some UX aspects require human judgment:

### Accessibility
- [ ] VoiceOver announces all interactive elements correctly
- [ ] Focus order is logical (top → bottom, left → right)
- [ ] All buttons have descriptive aria-labels
- [ ] Contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI)
- [ ] Dynamic Type scales text without breaking layout

### Haptics
- [ ] Vote buttons trigger medium impact haptic
- [ ] FAB tap triggers light impact haptic
- [ ] Error states trigger notification haptic

### Performance
- [ ] Scrolling maintains 60fps (no dropped frames)
- [ ] Animations are smooth (150ms vote pop, 300ms expand)
- [ ] Pull-to-refresh works within 3 seconds
- [ ] Infinite scroll loads within 2 seconds

### Safe Areas
- [ ] Content not obscured by notch/Dynamic Island
- [ ] Navigation not obscured by home indicator
- [ ] FAB properly positioned above home indicator
- [ ] Landscape orientation maintains proper spacing

## Priority Levels

- **P0 (Critical)**: Must fix before iOS App Store submission
- **P1 (High)**: Should fix for good UX, not blocking
- **P2 (Medium)**: Nice to have, can be addressed later

## Next Steps

1. **Fix P0 Issues**:
   - Remove navigation hiding behavior
   - Increase FAB spacing to 32px minimum
   - Add min-height to "Read more" buttons
   - Implement haptic feedback
   - Add safe area support to FAB

2. **Re-run Tests**:
   ```bash
   maestro test maestro-tests/
   ```

3. **Manual Verification**:
   - Test on iPhone 15 Pro Max (Dynamic Island)
   - Test on iPhone 13 mini (notch)
   - Test on iPhone SE (no notch)
   - Enable VoiceOver and verify accessibility
   - Monitor performance with Xcode Instruments

4. **App Store Submission**:
   - Ensure all P0 issues resolved
   - Document remaining P1/P2 issues for future releases
   - Include accessibility statement in App Store description

## Contact

For questions about these tests, see:
- iOS Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/ios
- Maestro Documentation: https://maestro.mobile.dev/
- Capacitor Haptics: https://capacitorjs.com/docs/apis/haptics
