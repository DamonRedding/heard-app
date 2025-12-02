# Sanctuary Voice - Anonymous Church Experiences Platform

## Overview

Sanctuary Voice is a web application that provides a safe, anonymous platform for congregation members to share experiences from their churches and receive community validation through a voting system. The platform addresses the need for accountability in church leadership by allowing members to report misconduct, manipulation, financial impropriety, or toxic culture without fear of retaliation.

The application enables users to:
- Submit anonymous experiences categorized by type (leadership, financial, culture, misconduct, spiritual abuse, other)
- Vote on submissions (Condemn or Absolve) to provide community validation
- Browse and filter submissions by category
- Flag inappropriate content for moderation
- Access an admin panel for content moderation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Library**: Shadcn/ui built on Radix UI primitives
- Provides accessible, customizable components following the design system
- Uses Tailwind CSS for styling with a custom color palette aligned to brand guidelines
- Component library configured in `components.json` with "new-york" style preset

**Routing**: Wouter for lightweight client-side routing
- Main routes: Home (feed), Submit (new submission form), About, Admin, NotFound

**State Management**: TanStack Query (React Query) for server state
- Handles data fetching, caching, and synchronization with backend
- Custom query client configured with credential-based auth
- Infinite scrolling implementation for submission feed

**Design System**: Custom theme based on PRD specifications
- Primary color: Deep Teal (#0D5C63) for trust and stability
- Secondary: Warm Sand (#F5F1E8) for backgrounds
- Accent: Muted Gold (#C9A227) for highlights
- Vote-specific colors: Condemn Red (#9B2C2C), Absolve Green (#276749)
- Typography: Inter for headings/body, Georgia/serif for submission content
- Dark mode support via theme provider

**Client-Side Storage**: localStorage for vote tracking
- Stores user's vote choices per submission to prevent duplicate voting
- Enables persistent vote state across sessions without requiring accounts

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**Server Structure**:
- Entry point: `server/index.ts` with HTTP server creation
- Route registration: `server/routes.ts` centralizes all API endpoints
- Static file serving: `server/static.ts` for production builds
- Development mode: Vite integration via `server/vite.ts` for HMR

**API Design**: RESTful endpoints with JSON responses
- `GET /api/submissions` - Fetch submissions with optional filtering (category, status, pagination)
- `POST /api/submissions` - Create new anonymous submission
- `POST /api/votes` - Cast or update vote on submission
- `DELETE /api/votes/:submissionId` - Remove vote
- `POST /api/flags` - Report submission for moderation
- `GET /api/categories/counts` - Get submission counts per category
- `GET /api/admin/submissions` - Admin-only endpoint for moderation queue
- `PATCH /api/admin/submissions/:id/status` - Update submission status (admin only)

**Rate Limiting**: In-memory rate limit store
- Submissions: 5 per 24 hours per IP
- Votes: 50 per 24 hours per IP
- IP hashing with SHA-256 for privacy protection

**Authentication**: Simple password-based admin authentication
- Admin password stored in environment variable
- No user accounts required for public submission/voting

**Build Process**: Custom build script (`script/build.ts`)
- Uses esbuild to bundle server code into single file
- Bundles specific dependencies to reduce cold start times
- Separates client build (Vite) from server build (esbuild)

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL dialect

**Database Provider**: Neon serverless PostgreSQL
- Connection pooling via `@neondatabase/serverless`
- WebSocket support for serverless environments
- Configuration in `drizzle.config.ts`

**Schema Design** (`shared/schema.ts`):

**Submissions Table**:
- `id`: UUID primary key
- `content`: Text field for experience (50-2000 characters)
- `category`: Enum (leadership, financial, culture, misconduct, spiritual_abuse, other)
- `timeframe`: Enum (last_month, last_year, one_to_five_years, five_plus_years)
- `denomination`: Optional text field
- `condemnCount`, `absolveCount`: Integer counters for votes
- `flagCount`: Integer counter for moderation flags
- `status`: Enum (active, under_review, removed)
- `churchName`, `pastorName`, `location`: Admin-only fields (not displayed publicly)
- Timestamps: `createdAt`, `updatedAt`

**Votes Table**:
- `submissionId`: Foreign key to submissions
- `voterHash`: SHA-256 hash of IP address
- `voteType`: Enum (condemn, absolve)
- Composite unique constraint on (submissionId, voterHash)

**Flags Table**:
- `submissionId`: Foreign key to submissions
- `reporterHash`: SHA-256 hash of IP address
- `reason`: Enum (spam, fake, harmful, other)
- Composite unique constraint on (submissionId, reporterHash)

**Storage Layer**: Abstraction in `server/storage.ts`
- Interface-based design for testability
- Methods for CRUD operations on submissions, votes, and flags
- Automatic vote count updates when votes are created/deleted
- Category count aggregation for filter UI

### External Dependencies

**UI & Styling**:
- Radix UI primitives (@radix-ui/*) - Accessible component foundations
- Tailwind CSS - Utility-first styling
- class-variance-authority - Component variant management
- lucide-react - Icon library

**Data Management**:
- Drizzle ORM (drizzle-orm, drizzle-zod) - Type-safe database queries
- Zod - Schema validation and TypeScript type inference
- TanStack Query - Server state management

**Backend Services**:
- Express - Web server framework
- @neondatabase/serverless - PostgreSQL connection
- ws - WebSocket support for Neon

**Development Tools**:
- Vite - Fast build tool and dev server
- TypeScript - Type safety across stack
- tsx - TypeScript execution for development
- esbuild - Production bundling

**Form Handling**:
- react-hook-form - Form state management
- @hookform/resolvers - Zod integration for validation

**Session & Security**:
- express-session - Session management (if needed for admin)
- connect-pg-simple - PostgreSQL session store
- Crypto (Node.js built-in) - IP hashing for anonymization

**Date Utilities**:
- date-fns - Date formatting and manipulation

**Notes**:
- No authentication service required for public features (anonymous by design)
- No email service integrated in MVP
- No payment processing (Stripe listed but not actively used)
- No file upload service (multer listed but not actively used)
- Admin panel uses simple password authentication rather than full auth system