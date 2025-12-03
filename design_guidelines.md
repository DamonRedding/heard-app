# Design Guidelines: Heard

## Brand Identity

**Name**: **Heard**
- Simple, powerful, direct
- Implies both listening and validation
- Tagline: "Your voice matters."

**Brand Tone**:
- Empowering, not preachy
- Safe, not sterile
- Honest, not angry
- Community-driven, not isolated

## Color Palette

- **Primary**: Deep Teal `#0D5C63` (trust and stability)
- **Secondary**: Warm Sand `#F5F1E8` (backgrounds)
- **Accent**: Muted Gold `#C9A227` (highlights)
- **Upvote**: Soft Green `#4CAF7A` (understanding, support)
- **Downvote**: Warm Coral `#E8774D` (gentle disapproval)
- **Flag/Warning**: Soft Red `#C44536`

## Typography

- **Headings**: Inter, weight 600-700
- **Body/UI**: Inter, weight 400-500
- **User Submissions**: Georgia (serif) for warmth and readability
- Line-height: 1.6 for submission text, 1.4 for UI elements

## Layout System

- Card padding: `p-6` to `p-8`
- Section spacing: `py-8` to `py-16`
- Card gaps: `gap-6`
- Border radius: `rounded-xl` to `rounded-2xl`
- Max container width: `max-w-2xl` for forms, `max-w-4xl` for feed

## Core Components

### Submission Cards
- Rounded corners with soft shadows
- Category badge in top corner
- Content in serif font for readability
- Vote buttons (Upvote/Downvote) with thumbs icons
- Emoji reactions picker (Facebook-style)
- Me Too counter for solidarity expressions

### Vote System
- **Upvote (Thumbs Up)**: Green tint for supportive/understanding responses
- **Downvote (Thumbs Down)**: Warm coral for gentle disagreement
- **Emoji Reactions**: Facebook-style picker with heart, care, haha, wow, sad, angry reactions
- Optimistic updates for immediate feedback
- LocalStorage for vote and reaction persistence
- Softer language: Icons replace aggressive terminology

### Category Filter
- Horizontal pill navigation
- Count badges on each category
- Active state with primary color

## Visual Elements

- **Corners**: rounded-xl (12px) to rounded-2xl (16px)
- **Shadows**: Subtle, layered shadows for depth
- **Icons**: Lucide React icon library
- **Dividers**: 1px hairline borders

## States

- **Loading**: Skeleton cards with pulsing animation
- **Empty**: Encouraging message with CTA
- **Error**: Clear message with retry option
- **Success**: Green checkmark with confirmation

## Dark Mode

Full dark mode support with adjusted color values:
- Background shifts to deep teal tones
- Cards use darker teal shades
- Text maintains proper contrast
- Vote colors remain vibrant

## Accessibility

- Minimum touch target 44x44px
- Contrast ratio 4.5:1 for text
- Focus states with visible outline
- ARIA labels on interactive elements
