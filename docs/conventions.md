# Conventions

## IDs
All entity IDs are **strings** (CUID from Prisma). Mock data uses prefixed format: `evt-1`, `mov-1`, `prop-1`, `book-101`, `past-1`, etc.

## Path Alias
`@/` maps to `./src/` (in both `tsconfig.json` and `vite.config.ts`).

## Data Flow Pattern
1. `router.tsx` defines loaders that call `domainApi.ts` functions
2. Loaders transform raw API responses → frontend types via `mapApiMember()` etc., with `try/catch` returning empty fallbacks
3. Pages read data via `useLoaderData()` — must handle null/empty gracefully
4. All UI built with MUI components + `sx` prop (no custom CSS classes)

## Host Milestone Badges
Host count → badge emoji computed in `router.tsx` `hostMilestoneBadge()`:
- 1+ → 🏠, 5+ → ⭐, 10+ → 🔥, 20+ → 👑
- Displayed on avatars in member wall and member detail pages

## Mappings (`src/lib/mappings.ts`) — Single Source of Truth
Do NOT create local duplicates of these:
- `eventTagToScene` — DB EventTag → ScenePhoto component key
- `chineseTagToEventTag` — Chinese label → DB EventTag
- `eventTagToChinese` — DB EventTag → Chinese label
- `roleLabelMap` — DB role → Chinese display name

## Naming Conventions
- Card fields: `message` (not `msg`), `visibility: 'public' | 'private'` (not `priv`)
- UI text: **Chinese (Simplified)**. Code/comments: English or Chinese.

## Theming (Two-Tier System)

### Tier 1: Custom Design Tokens (`src/theme.ts`)
- `cDark` / `cLight` — color token objects with keys: `bg`, `s1`, `s2`, `s3`, `line`, `text`, `text2`, `text3`, `warm`, `paper`, `ink`, `green`, `blue`, `red`, `stamp`, etc.
- `f` = system sans-serif (PingFang SC / Noto Sans SC), `hf` = serif (Georgia / Noto Serif SC)
- `posters` — gradient lookup for movie poster backgrounds
- `photos` — gradient lookup for event scene photo backgrounds
- **In components, use `useColors()` hook** (returns `cDark` or `cLight` based on current mode)
- `import { c } from '@/theme'` only for static/non-reactive contexts

### Tier 2: MUI Theme (`src/muiTheme.ts`)
- Primary: `#d4a574` (warm), Secondary: `#6f9d8f`
- Border radius: `12px`, buttons: `textTransform: 'none'`
- Dark mode is **default** on first load (persisted in `localStorage` key `chuanmen-color-mode`)
- Toggle via `useColorMode()` hook from `AppProviders.tsx`

## Responsive Layout
- Mobile ↔ Desktop breakpoint: `md` (900px)
- AppLayout: bottom tab bar (mobile) / 240px sidebar (desktop), content `maxWidth: 1100px`
- AdminLayout: overlay drawer (mobile) / permanent sidebar (desktop), content `maxWidth: 1200px`

## Shared Components
- `Atoms.tsx` — `Ava` (avatar with emoji badge, hue from `name.charCodeAt(0)*37%360`) and `AvaStack` (overlapping row)
- `ScenePhoto` / `Poster` — render gradient backgrounds from `theme.ts` lookups
- `FeedItems.tsx` — all feed card variants (FeedActivity, FeedCard, FeedMovie, FeedMilestone, FeedNewMember, FeedSmallGroup, FeedBirthday, FeedActionNotice, FeedCommentNotice, FeedRecommendation, etc.)
- `PostCard.tsx` — thank-you card component (props: `message`, `isPrivate`)
- `TaskClaimDialog.tsx` — post-signup dialog for claiming event tasks or volunteering custom ones
- `MilestoneTimeline.tsx` — "成长足迹" timeline on profile pages
- `ImageUpload.tsx` — reusable image upload with crop/preview
- `EmptyState.tsx` — consistent empty state placeholder across pages
- `FeedbackDialog.tsx` — user feedback/suggestion submission dialog
- `QuickActionDialog.tsx` — search dialog for quick actions (postcards, events, etc.)
- `ConfirmDialog.tsx` — confirmation modal
- `RichTextEditor.tsx` — TipTap-based rich text editor/viewer
