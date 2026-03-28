# API Reference

All frontend API calls go through `src/lib/domainApi.ts` (100+ functions). No mock data is used — all pages connect to real backend endpoints.

## Backend Modules

| Module | Prefix | Key Endpoints |
|--------|--------|---------------|
| Users | `/api/users` | CRUD, apply, settings, admin list, approve/reject, announce (内部公示期), operator roles |
| Events | `/api/events` | CRUD, past/cancelled, photos, invite, signup, waitlist (approve/reject/offer/accept/decline), recommendation linking, check-in |
| Event Tasks | `/api/events/:eventId/tasks` | List, batch create, claim, unclaim, volunteer (custom task), update, delete |
| Movies | `/api/movies` | CRUD, vote, search, external search (TMDB) |
| Proposals | `/api/proposals` | CRUD, vote, search |
| Postcards | `/api/postcards` | CRUD, admin list/delete |
| Recommendations | `/api/recommendations` | List, search, create, edit, delete, vote (all categories) |
| Comments | `/api/comments` | CRUD, admin list (polymorphic: movie/event/proposal), @mentions (`mentionedUserIds`) |
| Likes | `/api/likes` | Toggle, list (polymorphic) |
| About | `/api/about` | Stats, content CRUD, announcements CRUD |
| Title Rules | `/api/title-rules` | CRUD, holders count, grant/revoke |
| Task Presets | `/api/task-presets` | CRUD per event type |
| Lottery | `/api/lottery` | Current draw, history, accept, skip, complete, update host candidate status |
| Newsletters | `/api/newsletters` | CRUD, send, stats |
| Site Config | `/api/config` | Key-value config store |

## Top-Level Routes

| Route | Purpose |
|-------|---------|
| `/api/feed` | Aggregated feed (events, postcards, movies, proposals, announcements, recommendations, birthdays, notifications, lottery) |
| `/api/profile` | Member profile with mutual computation |
| `/api/media` | Presign, confirm, upload, delete (S3) |
| `/api/email` | Rule engine, templates, logs, queue, bounces, suppressions |
| `/api/auth` | Send code, verify code, check email, Google OAuth login |
| `/api/agent` | Trigger agent tick |
| `/api/health` | Health check with DB ping |
| `/api/admin/stats` | Dashboard statistics |

## Auth System

- **Login (two methods)**:
  1. **Email verification code** — `POST /api/auth/send-code` → `POST /api/auth/verify-code`
  2. **Google One Tap** — `POST /api/auth/google` (verifies Google JWT, auto-binds `googleId`)
- Google login: if user exists (by `googleId` or `email`) and is `approved` → login. If not registered → returns `googleProfile` and frontend redirects to `/apply` with prefilled name/email/avatar.
- Google button only renders when `VITE_GOOGLE_CLIENT_ID` env var is set. Uses native GIS script (no npm dependency).
- User state stored in `localStorage` key `chuanmen.auth.user` (or `sessionStorage` if "remember me" is off)
- `AuthContext` provides `{ user, isRegistered, hydrated, setUser }`
- `hydrated` flag prevents UI flashing before auth resolves
- On first load with no stored user, auto-signs-in as a **walkthrough user** (`walkthrough-yuan-001`, role `admin`). The provider resolves the real DB ID via `getUserByEmail()`.
- IDs starting with `walkthrough-` are treated as demo; real IDs are CUID-length (>20 chars)
- **No JWT/session on backend** — API endpoints are unprotected. `PATCH /api/users/me/settings` uses a manual `x-user-id` header.
- Three roles: `admin`, `host`, `member` (string equality checks)
- `AdminLayout` hard-gates on `user.role === 'admin'`

## Features

### User-Facing
- **Feed (动态流)** — Aggregated timeline of events, postcards, movies, proposals, milestones, announcements, recommendations, birthday cards. Time-based grouping. SpeedDial-style quick action buttons (发起活动, 提创意, 寄感谢卡, 推荐电影). **Personal notifications** (7 types: mention, event_invite, task_assign, postcard_received, waitlist_offered, waitlist_approved, proposal_realized). **Weekly lottery** status and accept/skip actions. Birthday cards for friends with mutual postcards.
- **Events (活动)** — Three-tab layout (即将到来 / 创意孵化中 / 过往活动). Two-phase invite system (invite → open → closed → ended). Waitlist with 24h offer mechanism (auto-expire via cron). **Task claiming system** (host creates tasks from presets, members claim/volunteer after signup via `TaskClaimDialog`). Host can manage invites, signups, movie selection, task assignment, recommendation linking. Per-event photo gallery. Supports private events, home events with private location.
- **Discover (发现/推荐)** — Unified multi-category browser (movies, books, recipes, music, places, external events). Tabbed view with external search (TMDB). Replaces separate category pages. Book detail page for book recommendations.
- **Proposals (活动提案)** — Submit and vote on activity ideas. Status lifecycle: discussing → scheduled → completed → cancelled. "我来组织" converts a proposal into an event.
- **Postcards (感谢卡)** — Three-step send flow (选人 → 写话 → 预览寄出). Privacy modes (public/private). Credit-based system: 4 credits on registration, +2 per completed event for attendees, host gets +6 (+2 attend + 4 host bonus). Only awards if at least 1 participant besides host; cancelled/empty events don't count. Agent awards credits automatically via `creditsAwarded` flag on Event. Preset tag selection for quick messages.
- **Profile (我的页面)** — Participation stats, milestone timeline (成长足迹 via `MilestoneTimeline`), hosted events, movies, postcards sent/received.
- **Member Wall (成员墙)** — Gallery grid with cover photos, titles, host badges. Search by name/title. Member detail page with mutual experience tracking (共同活动, 共同品味, 互寄卡片).
- **About Page** — Hero section, community stats, 5 entry cards (成员, 串门原则, Host 手册, 串门来信, 关于我们), bottom beliefs, CTA for visitors.
- **Settings** — Profile editing, avatar/cover upload, host settings (house rules, address), notification preferences (email frequency, per-type toggles), privacy controls (hide email/activity/stats, birthday, title display control), card credit balance.
- **Apply** — Application form for new members with duplicate email/name checks. Google profile prefill (name/email/avatar) via router state. Newsletter subscription checkbox (default on). Submits `googleId` and `subscribeNewsletter` to backend.
- **Login** — Email verification code flow (send code → verify code) + Google One Tap sign-in. Walkthrough user for demo.
- **Weekly Lottery (小局抽签)** — Candidate pool opt-in (auto-nudge after 3 consecutive events). Monday auto-draw via cron. Drawn member sees accept/skip in feed. Accepted → creates event. History tracking per week.

### Admin Dashboard (12 pages, all connected to real API)
- **Dashboard** — Community stats overview
- **Members** — Three-tab layout (成员列表 / 待审核 / 介绍中). Application review with 3-day introduction period (内部公示期). Auto-approve via cron after announcement period. Full member table with filtering/search, operator role assignment, admin promotion
- **Events** — Event management with status filtering, bulk operations
- **Content** — Comment/postcard moderation
- **Cards** — Postcard management and admin deletion
- **Titles** — Title rule CRUD (emoji, stamp tag, threshold), grant/revoke per user
- **Task Presets** — Per-event-type task template management
- **Announcements** — Milestone/announcement/host-tribute publishing with pin control
- **Email** — Rule management, template editing with preview, send logs, queue management, bounce/suppression tracking, global config
- **Newsletters** — Draft/send/track newsletters
- **Community Info** — Rich text CMS for about page content (principles, host guide, letters, about)
- **Settings** — Site config key-value store, admin user management
