# Design Guidelines: Church Confessional MVP

## Design Approach
**User-Provided Specifications**: This design follows the detailed specifications from the PRD, prioritizing trust, safety, and community through restrained, purposeful design.

## Brand Tone & Principles
- Safe, not sterile
- Honest, not angry  
- Community, not isolated
- Modern, not churchy
- Zero friction to read, minimal friction to submit
- No religious iconography (inclusive platform)

## Typography
- **Headings**: Inter, weight 600
- **Body Text**: Inter, weight 400
- **Submission Content**: Georgia or serif for readability and warmth
- Generous line-height for readability of sensitive content

## Color Palette
- **Primary**: Deep Teal `#0D5C63` (trust, stability)
- **Secondary**: Warm Sand `#F5F1E8` (backgrounds)
- **Accent**: Muted Gold `#C9A227` (highlights)
- **Danger/Flag**: Soft Red `#C44536`
- **Condemn Vote**: Judgment Red `#9B2C2C`
- **Absolve Vote**: Mercy Green `#276749`

## Layout & Spacing
Use Tailwind spacing units: **2, 4, 8, 12, 16, 20** for consistent rhythm
- Card padding: `p-6` or `p-8`
- Section spacing: `py-12` to `py-20`
- Generous whitespace between cards: `gap-6` or `gap-8`

## Core Components

### Submission Card (Public View)
- **Structure**: Category tag + timeframe in header, truncated text preview (3 lines), vote buttons + flag icon at bottom
- **Styling**: Rounded corners `rounded-xl`, soft shadow `shadow-lg`, warm background
- **Vote Display**: Icon + count for Condemn (⚖) and Absolve (✓)
- **Interactive Elements**: Entire card clickable to expand, vote buttons with fill animation, flag icon

### Submission Form
- **Fields Layout**: Vertical stack with clear labels
- **Public Fields**: Experience text (50-2000 char textarea with live counter), Category dropdown, Timeframe dropdown, Denomination optional
- **Admin-Only Fields**: Clearly labeled with helper text "NOT displayed publicly" - Church Name, Pastor Name, City/State
- **Submit Button**: Disabled state until minimum requirements met, loading spinner → checkmark animation
- **Success State**: Toast message "Your voice matters. Thank you."

### Vote Buttons
- **Design**: Two distinct buttons side-by-side
- **Labels**: "Condemn" (red) / "Absolve" (green)
- **Interaction**: Tap to vote, button fills with color + subtle scale (1.05x, 150ms ease-out), number tick animation on count increment
- **State**: Toggle behavior, localStorage persistence, active state indicator

### Category Filter
- **Display**: Horizontal pill navigation or vertical sidebar list
- **Categories**: Leadership, Financial, Culture, Misconduct, Spiritual Abuse, Other
- **Counts**: Show submission count per category
- **Active State**: Filled background with primary color

### Admin Dashboard
- **Layout**: Table or expanded card view showing ALL fields including church name, pastor name, location
- **Actions**: Approve, Remove, Pattern Watch buttons
- **Highlighting**: Flagged submissions visually distinct with flag count
- **Protected**: Password gate before access

## Visual Elements
- **Corners**: Rounded `rounded-xl` (12px) throughout
- **Shadows**: Soft, layered `shadow-md` to `shadow-lg`
- **Abstract Light Motifs**: Subtle gradient overlays or soft glow effects (minimal)
- **No Religious Icons**: Keep imagery secular and inclusive

## Animations (Minimal)
- Vote button: Scale + fill (150ms ease-out)
- Number counters: Tick animation on increment
- Submit button: State transitions (idle → loading → success)
- Card hover: Subtle lift `hover:shadow-xl` transition
- Flag modal: Fade in/out

## Loading & Empty States
- **Skeleton Cards**: Pulsing placeholder cards while loading
- **Infinite Scroll**: Load more button as fallback
- **Empty Category**: "No experiences shared yet. Be the first."
- **Error State**: "Something went wrong. Please try again."

## Images
No hero images or decorative photography for MVP. Focus on clean, trust-building interface with generous whitespace. Platform is content-first - user submissions are the primary visual element.