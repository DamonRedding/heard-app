# Design Guidelines: Heard

## Brand Identity

**Name**: **Heard** (final selection)
- Simple, powerful, direct
- Implies both listening and validation
- Tagline: "Your voice. Your truth. Your community."

**Brand Tone**:
- Empowering, not preachy
- Safe, not sterile
- Honest, not angry
- Community-driven, not isolated
- Modern, secular, inclusive

## Design Approach

**Reference-Based**: Drawing from Linear's clarity + Signal's trust indicators + Medium's reading experience. This platform is content-first with strategic visual restraint to center user stories.

## Typography

- **Headings**: Inter, weight 600-700
- **Body/UI**: Inter, weight 400-500  
- **User Submissions**: Georgia or Lora (serif) weight 400 for warmth and readability
- **Hero/Marketing**: Inter weight 700-800
- Line-height: 1.6 for submission text, 1.4 for UI elements

## Color Palette (Updated)

- **Primary**: Deep Slate `#1e3a4c` (credibility, strength)
- **Secondary**: Soft Sage `#7fa99b` (calm, support)
- **Accent**: Warm Coral `#e88873` (empowerment, warmth)
- **Background**: Warm Ivory `#faf8f5`
- **Surface**: White with subtle warm tint `#ffffff`
- **Condemn Vote**: Strong Red `#d84a38`
- **Absolve Vote**: Affirming Green `#2d8659`
- **Flag/Warning**: Alert Orange `#d97706`

## Layout System

Tailwind spacing units: **4, 6, 8, 12, 16, 20, 24**
- Card padding: `p-8`
- Section spacing: `py-16` to `py-24`
- Card gaps: `gap-6`
- Max container width: `max-w-4xl` for reading, `max-w-7xl` for browse views

## Images

**Hero Section**: Yes - abstract imagery of voices/sound waves, diverse silhouettes, or light breaking through. Avoid religious imagery. Image should feel empowering and communal.
- Placement: Full-width hero (80vh) with gradient overlay
- Treatment: Subtle blur or dark overlay (opacity 0.4) for text readability
- Buttons on hero: Backdrop blur background, no hover states (implement button's native states)

**Additional Images**: Optional testimonial avatars (abstract/illustrated), empty state illustrations (warm, encouraging)

## Core Components

### Homepage Hero
- **Height**: 80vh on desktop, 60vh on mobile
- **Content**: Large headline "Your voice deserves to be heard", subhead explaining platform, dual CTAs ("Share Your Experience" primary + "Browse Stories" secondary)
- **Buttons**: White text on blurred dark background, native hover states
- **Layout**: Centered content with max-w-2xl

### Submission Feed (Main Browse)
- **Layout**: Single column, max-w-4xl centered, infinite scroll
- **Card Structure**: 
  - Header: Category pill (left) + timeframe badge (right)
  - Body: 4-line preview of submission text in serif font
  - Footer: Vote buttons side-by-side + flag icon (right)
  - Spacing: p-8, rounded-2xl, shadow-md
- **Hover**: Subtle lift with shadow-xl transition
- **Card Background**: White surface on warm ivory page background

### Submission Detail (Expanded View)
- **Layout**: Modal overlay or dedicated page, max-w-3xl
- **Content**: Full submission text in serif, generous line-spacing
- **Meta**: Category, timeframe, vote counts prominently displayed
- **Actions**: Vote buttons fixed at bottom or inline after text

### Submit Form
- **Layout**: Multi-step vertical flow or single-page with clear sections
- **Public Fields**: 
  - Experience textarea (50-2000 chars, live counter below)
  - Category dropdown
  - Timeframe dropdown  
  - Denomination text input (optional, small helper text)
- **Private Fields** (admin-only): Clearly separated with border-top, muted background
  - Section header: "For admin review only (NOT shown publicly)"
  - Church Name, Pastor Name, City/State inputs
- **Submit Button**: Full-width, disabled until valid, loading spinner → checkmark transition
- **Success**: Toast notification + redirect to feed with "Thank you for sharing" message

### Vote System
- **Buttons**: Side-by-side equal width
- **Condemn**: Red background, scale icon
- **Absolve**: Green background, check icon  
- **Animation**: Tap → fill color + scale 1.05x (150ms ease-out), count increment with brief highlight
- **State Persistence**: LocalStorage, active vote has stronger color saturation

### Category Filter
- **Desktop**: Horizontal pill navigation below hero
- **Mobile**: Dropdown or bottom sheet
- **Pills**: Rounded-full, count badges, active state with primary color fill
- **Categories**: Leadership, Financial, Culture, Misconduct, Spiritual Abuse, Other

### Admin Dashboard
- **Layout**: Table view with expandable rows or card grid
- **Columns**: Submission preview, category, votes, flags, private details (church/pastor/location)
- **Actions**: Approve (green), Remove (red), Flag for Review (orange)
- **Auth Gate**: Password protected page

### Footer
- **Content**: About Heard, How It Works, Community Guidelines, Contact, Social Links
- **Newsletter**: Optional email capture with privacy reassurance
- **Layout**: 3-4 column grid on desktop, stacked on mobile

## Visual Elements

- **Corners**: rounded-2xl (16px) for cards, rounded-full for pills/badges
- **Shadows**: Layered shadows - shadow-md default, shadow-xl on hover/active states
- **Gradients**: Subtle overlays on hero image, accent gradients on CTAs
- **Dividers**: 1px hairline in muted gray between sections
- **Icons**: Heroicons (outline for inactive, solid for active states)

## Animations (Restrained)

- Vote buttons: Fill + scale (150ms)
- Card hover: Lift shadow (200ms)
- Submit button: State transitions with spinner/checkmark
- Number counts: Brief highlight on increment
- Modal/toast: Fade in/out (250ms)
- NO scroll-triggered animations, NO parallax

## States

- **Loading**: Skeleton cards (3-4 pulsing placeholders)
- **Empty Category**: "No stories yet. Be the first to share." with CTA
- **Error**: "Something went wrong. Please refresh." with retry button
- **Success**: Green checkmark toast, auto-dismiss after 3s

## Accessibility

- Minimum touch target 44x44px
- Contrast ratio 4.5:1 for text
- Focus states with visible outline (2px accent color)
- ARIA labels on vote buttons, flag actions
- Keyboard navigation support for all interactive elements