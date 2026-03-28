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

## Design Principles

### Data Mapping — Single Source of Truth
All entity data mapping (user, event, proposal, movie, etc.) MUST go through shared mapper functions in `src/lib/mappers.ts`. **Never construct user/entity objects inline** in loaders or components.

- `mapUser(raw)` — user name/avatar/id mapping (single place to fix avatar bugs)
- `mapUsers(list)` — voter/participant lists
- Existing mappers: `mapApiEvent()`, `mapApiCard()`, `mapApiMember()`, `mapRecommendation()` in `router.tsx`

When a field is missing from the UI, fix the **mapper function** — not the individual call site.

### Backend User Data Contract
All backend API endpoints that return user data MUST include `{ id, name, avatar }` via the shared `USER_BRIEF_SELECT` constant (`server/src_v2/utils/prisma-selects.ts`). Never write `{ select: { id: true, name: true } }` without avatar.

### Field Naming Consistency
- Vote counts: always `voteCount` (not `v` or `votes`)
- Author name: always `authorName` (not `by` or `name` when ambiguous)
- These conventions are enforced by mappers — raw API data may vary, but mapper output is consistent.

### Backward Compatibility
- API response fields can only be **added**, never removed
- Field renames must keep the old name alongside the new one until all consumers migrate
- DB schema changes must be additive (ADD COLUMN with defaults, never DROP COLUMN)
- When changing capacity/count semantics, migrate existing data in the migration SQL

### New Page/Loader Checklist
When adding a new page or loader, verify:
1. All user data uses `mapUser()` / `mapUsers()` — never inline `{ name: x.name, avatar: x.avatar }`
2. All entity data uses existing mappers where available
3. Backend includes use `USER_BRIEF_SELECT` for user relations
4. Avatar displays correctly for all user references on the page
