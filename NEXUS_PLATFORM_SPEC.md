# NEXUS — Technical Product Specification
### Version 1.0 | Lead Technical PM & System Architect Reference Document
### Last Updated: March 1, 2026

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Routing Map](#5-routing-map)
6. [Global Systems](#6-global-systems)
7. [Feature Modules — Detailed Breakdown](#7-feature-modules)
   - 7.1 [Home](#71-home)
   - 7.2 [Dashboard](#72-dashboard)
   - 7.3 [Practice Hub](#73-practice-hub)
   - 7.4 [Study Planner](#74-study-planner)
   - 7.5 [Aim Page (AI Career Roadmap)](#75-aim-page)
   - 7.6 [Experience Hub](#76-experience-hub)
   - 7.7 [Guidance Page](#77-guidance-page)
   - 7.8 [Guidance Story](#78-guidance-story)
   - 7.9 [Placement Portal](#79-placement-portal)
   - 7.10 [Internships](#710-internships)
   - 7.11 [Hackathons](#711-hackathons)
   - 7.12 [Whiteboard](#712-whiteboard)
   - 7.13 [Resume Builder (Planned)](#713-resume-builder-planned)
   - 7.14 [Project Workspace](#714-project-workspace)
8. [Backend API Reference](#8-backend-api-reference)
9. [Database Design](#9-database-design)
10. [External API Integrations](#10-external-api-integrations)
11. [State Management](#11-state-management)
12. [Known Gaps & Pending Work](#12-known-gaps--pending-work)
13. [Cross-Module Data Flow](#13-cross-module-data-flow)

---

## 1. Platform Overview

**Nexus** is a comprehensive, end-to-end career accelerator and development platform built specifically for student developers. It consolidates every tool a student needs to go from learning fundamentals to landing their first tech role — all in one cohesive experience.

### Core Value Proposition
> "One platform. Every step of your engineering career journey."

| Problem It Solves | How Nexus Solves It |
|---|---|
| DSA practice scattered across multiple tabs | Practice Hub: all 3800+ LeetCode problems, tracked locally |
| No structured weekly study plan | Study Planner: visual weekly timeline with Pomodoro |
| "How did they get that offer?" | Guidance Page: real career dossiers from hired engineers |
| Resume blind spots | Resume Builder: ATS-aware builder (planned) |
| No single place to track applications | Placement Portal: aggregated job/internship boards |
| Uncertainty about what to learn next | Aim Page: AI roadmap generator per target role + company |
| Whiteboard interviews with no practice tool | Whiteboard: canvas with tech stencils |
| Hackathon & internship deadlines slip | Hackathons / Internships: deadline-aware listing pages |

### Current Feature Status

| Module | Route | Status |
|---|---|---|
| Home | `/` | ✅ Live |
| Dashboard | `/dashboard` | ✅ Live (mock data) |
| Practice Hub | `/practice` | ✅ Live (backend + DB) |
| Study Planner | `/study-planner` | ✅ Live (mock data) |
| Aim Page | `/aim` | ✅ Live (mock AI) |
| Experience Hub | `/experience-hub` | ✅ Live (static) |
| Guidance Page | `/guidance` | ✅ Live (static dossiers) |
| Guidance Story | `/guidance/:id` | ✅ Live |
| Path Builder | `/guidance/build` | ✅ Live |
| Placement Portal | `/placement-portal` | ✅ Live (external links) |
| Internships | `/internships` | ✅ Live (static) |
| Hackathons | `/hackathons` | ✅ Live (static) |
| Whiteboard | `/whiteboard` | ✅ Live |
| Whiteboard Canvas | `/whiteboard/:canvasId` | ✅ Live |
| Project Workspace | `/project-workspace` | ✅ Live |
| Resume Builder | `/resume` | ❌ Route missing — component not built |

---

## 2. Tech Stack

### Frontend
| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19 |
| Build Tool | Vite | 7 |
| Routing | React Router DOM | 7 |
| Animation | Framer Motion | 12 |
| Animation | GSAP | 3 |
| 3D / Canvas | Three.js + @react-three/fiber | 0.183 / 9 |
| Charts | Recharts | 3 |
| Icons | Lucide React + React Icons | Latest |
| UI Primitives | MUI (Material UI) | 7 |
| Confetti | canvas-confetti | 1.9 |
| PDF Parsing | pdfjs-dist | 5 |
| Flow Diagrams | @xyflow/react | 12 |
| Styling | CSS Modules (per component) + Tailwind CSS | 4 |

### Backend
| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 22 |
| Framework | Express.js | 4 |
| HTTP Fetching | node-fetch | 2 |
| CORS | cors | 2 |
| Data Store | JSON flat-file (`nexus-db.json`) | — |
| Dev Server | nodemon | 3 |

### Infrastructure (Local Dev)
| Component | Port | Notes |
|---|---|---|
| Vite Dev Server | 5173 | Proxies `/api/*` → 3001 |
| Express API Server | 3001 | Must be running separately |

---

## 3. Repository Structure

```
nexus/
├── index.html                      # Vite entry
├── vite.config.js                  # Proxy: /api/* → :3001
├── package.json                    # Frontend deps
├── eslint.config.js
│
├── src/
│   ├── main.jsx                    # React root mount
│   ├── App.jsx                     # All <Route> definitions
│   ├── ProjectWorkspace.jsx        # Project Workspace page
│   │
│   ├── components/                 # One file per page/feature
│   │   ├── Navbar.jsx              # Global navigation (StaggeredMenu)
│   │   ├── Footer.jsx              # Global footer
│   │   ├── Home.jsx                # Landing page + bento grid
│   │   ├── Dashboard.jsx           # Career dashboard
│   │   ├── PracticeHub.jsx         # LeetCode problem tracker
│   │   ├── StudyPlanner.jsx        # Weekly planner + Pomodoro
│   │   ├── AimPage.jsx             # AI career roadmap generator
│   │   ├── ExperiencePage.jsx      # Hub linking to internships/hackathons
│   │   ├── GuidancePage.jsx        # Career dossier index
│   │   ├── GuidanceStory.jsx       # Single dossier detail
│   │   ├── PathBuilder.jsx         # Interactive path builder
│   │   ├── PLacementPortal.jsx     # Job board aggregator
│   │   ├── Internships.jsx         # Internship listings
│   │   ├── Hackathons.jsx          # Hackathon listings
│   │   ├── Whiteboard.jsx          # Canvas list/manager
│   │   ├── WhiteboardCanvas.jsx    # Active drawing canvas
│   │   ├── ExperienceRadar.jsx     # Radar chart component
│   │   ├── CardNav.jsx             # Card navigation component
│   │   ├── ComponentTree.jsx       # Tree visualization
│   │   ├── DatabaseBoard.jsx       # Database board
│   │   ├── LightRays.jsx           # Decorative background
│   │   ├── PortalTransition.jsx    # Page transition portal effect
│   │   ├── ScrollToTop.jsx         # Auto scroll on route change
│   │   ├── StaggeredMenu.jsx       # Animated nav menu
│   │   └── TargetCursor.jsx        # Custom cursor component
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx         # User identity (demo mode)
│   │   └── PomodoroContext.jsx     # Pomodoro timer state
│   │
│   ├── styles/                     # Per-component CSS files
│   │   └── *.css
│   │
│   └── assets/
│       └── image/                  # Static images (avatar, etc.)
│
├── server/                         # Express backend
│   ├── index.js                    # Server entry, CORS, route mount
│   ├── db.js                       # JSON file store ORM
│   ├── package.json
│   │
│   ├── routes/
│   │   └── practice.js             # All Practice Hub API endpoints
│   │
│   └── data/
│       ├── nexus-db.json           # User data + solved problems store
│       ├── problems.json           # Curated 350-problem fallback list
│       └── lc-problems-cache.json  # 24h LeetCode API response cache
│
└── preserve/                       # Archived older component versions
    ├── css/
    └── jsx/
```

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (User)                           │
│                                                                 │
│    React 19 + Vite   │   React Router v7 (SPA, client-side)    │
│    Framer Motion     │   GSAP  │  Three.js  │  Recharts        │
└─────────────────────────────────┬───────────────────────────────┘
                                  │  /api/* (proxied)
                ┌─────────────────▼─────────────────┐
                │        Express.js  :3001            │
                │                                     │
                │  Routes:                            │
                │   /api/practice/*   → practice.js   │
                │   /api/health       → inline        │
                └──────────────┬──────────────────────┘
                               │
              ┌────────────────▼────────────────┐
              │    db.js  (JSON flat-file store) │
              │    nexus-db.json                 │
              │    lc-problems-cache.json        │
              └─────────────────────────────────┘

External APIs called from server:
  ├── LeetCode GraphQL API  →  paginated problem list (cached 24h)
  └── (LeetCode GraphQL)    →  recent AC submissions (sync, legacy)

External APIs called directly from browser:
  ├── GitHub REST API       →  AimPage (user profile + repos)
  └── LeetCode GraphQL      →  AimPage (recent AC submissions fallback)
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| JSON flat-file store (no SQL) | Zero native deps — runs on any machine without build tools |
| Server-side 24h problem cache | Avoids hitting LeetCode API on every page load; paginated fetch collects all ~3800+ problems |
| Anonymous per-device user IDs | No auth system yet — `nexus_practice_username` UUID stored in `localStorage` |
| Vite proxy for `/api/*` | Avoids CORS issues in local dev; production would use same-origin or a real reverse proxy |
| Per-component CSS | Scoped styles with no CSS-in-JS overhead; easy to hand off per module |

---

## 5. Routing Map

| Path | Component | Layout | Notes |
|---|---|---|---|
| `/` | `Home` | Navbar + Footer | Landing page, bento grid |
| `/dashboard` | `Dashboard` | Navbar + Footer | Uses `AuthContext` for user name |
| `/practice` | `PracticeHub` | Navbar + Footer | Backed by Express API |
| `/practice-hub` | Redirect | — | → `/practice` |
| `/study-planner` | `StudyPlanner` | Navbar + Footer | Wrapped in `PomodoroProvider` |
| `/aim` | `AimPage` | Navbar + Footer | PDF.js + GitHub API |
| `/experience-hub` | `ExperiencePage` | Navbar + Footer | Hub pointing to sub-pages |
| `/internships` | `Internships` | Navbar + Footer | Static listings |
| `/hackathons` | `Hackathons` | Navbar + Footer | Static listings |
| `/guidance` | `GuidancePage` | Navbar + Footer | Dossier index |
| `/guidance/build` | `PathBuilder` | Navbar + Footer | Interactive builder |
| `/guidance/:id` | `GuidanceStory` | Navbar + Footer | Single dossier detail |
| `/placement-portal` | `PlacementPortal` | Navbar + Footer | External job board links |
| `/whiteboard` | `Whiteboard` | Navbar + Footer | Canvas session manager |
| `/whiteboard/:canvasId` | `WhiteboardCanvas` | Minimal | Active canvas |
| `/project-workspace` | `ProjectWorkspace` | Standalone | Project case studies |
| `/resume` | ❌ Not registered | — | **MISSING** — needs component + route |

---

## 6. Global Systems

### 6.1 Navigation — `Navbar.jsx` + `StaggeredMenu.jsx`
- Fixed-position animated hamburger menu (slides in from right)
- 10 nav items with route awareness (`activePath` highlights current)
- Social links: GitHub, LinkedIn, Twitter
- Color scheme: `#1e1340` → `#5227FF` gradient with `#8b5cf6` accent

**Nav Items in order:**
Home → Dashboard → Whiteboard → Practice Hub → Study Planner → Experience Hub → Aim → Resume → Guidance → Placement Portal

### 6.2 Authentication — `AuthContext.jsx`
- **Current state: Demo mode only.** No real login/signup implemented.
- Stores `{ name, email, id, gender }` in React state (resets on refresh)
- Used by: `Dashboard` (display name, avatar gender)
- `AuthProvider` is **not wrapping App.jsx** — Dashboard is the only consumer and it uses `useAuth()` directly

> ⚠️ **Gap:** `AuthProvider` is imported inside `Dashboard.jsx` but wrapping is inconsistent. Any page that calls `useAuth()` directly without the Provider in the tree will throw.

### 6.3 Pomodoro Timer — `PomodoroContext.jsx`
- Global timer state: work (25 min) / break (5 min) cycle
- Persisted for the lifetime of the session only (no localStorage)
- Only wraps `/study-planner` route — not global
- Exposes: `mode`, `isRunning`, `secondsLeft`, `totalStudySeconds`, `startWork`, `startBreak`, `skipBreak`, `pause`, `resume`, `reset`

### 6.4 Page Transitions — `PortalTransition.jsx`
- Triggered by `handleBentoClick` on the Home page
- Creates a portal/zoom-wipe effect from the clicked bento card's center
- Only used on the Home page bento grid

### 6.5 Scroll Behaviour — `ScrollToTop.jsx`
- `useEffect` on `location.pathname` change → `window.scrollTo(0, 0)`
- Mounted once inside `<App>` above all routes

---

## 7. Feature Modules

---

### 7.1 Home

**Route:** `/`
**File:** `src/components/Home.jsx`
**Status:** ✅ Live

#### Purpose
Landing/marketing page. Introduces all platform features and routes users to them.

#### Key UI Sections
1. **Hero** — headline, animated background, CTA buttons
2. **Features Grid** — 9 feature cards with icons, descriptions, short descriptions
3. **Bento Grid** — interactive 7-card mosaic; clicking any card triggers `PortalTransition` to that route
4. **"Problems" Strip** — callout section (design/systems challenges)
5. **CTA Section** — final call to join / sign up

#### Feature Cards (in order)
| Title | Target Route | Icon |
|---|---|---|
| Central Dashboard | `/dashboard` | LayoutDashboard |
| Practice Hub | `/practice` | Target |
| Study Planner | `/study-planner` | Calendar |
| Whiteboard | `/whiteboard` | Pencil |
| Project Hub | `/project-workspace` | Folder |
| Resume Builder | `/resume` ⚠️ (currently → `/aim`) | FileText |
| AI Mentor | `/aim` | Bot |
| Experience Hub | `/experience-hub` | Users |
| Placement Portal | `/placement-portal` | Briefcase |

#### Bento Grid Cards
| Card | Route |
|---|---|
| DSA + Practice Hub | `/practice` |
| System Design | `/whiteboard` |
| AI Career | `/aim` |
| Experience | `/experience-hub` |
| Internships | `/internships` |
| Projects | `/project-workspace` |
| Resume | `/resume` ⚠️ (currently routes to `/aim`) |

#### Interactions
- `TargetCursor` — custom cursor active on this page
- `IntersectionObserver` — `.scroll-animate` elements fade in on scroll
- `PortalTransition` ref triggers on bento card click

---

### 7.2 Dashboard

**Route:** `/dashboard`
**File:** `src/components/Dashboard.jsx`
**Status:** ✅ Live (all data is mock/hardcoded)

#### Purpose
Central career readiness command centre. Gives the user a single-view summary of all their activity.

#### Key UI Sections
1. **Hero Strip** — avatar, name (from `AuthContext`), readiness score arc, GSAP tile entrance
2. **Bento Tile Grid** — 8 quick-launch tiles for all platform tools
3. **Study Tasks** — checklist with completion ring
4. **Internship Tracker** — upcoming deadlines with status chips
5. **Hackathon Countdown** — 3 upcoming events with prize info
6. **Resume Tile** — links to `/experience` (**bug**: should be `/resume`)
7. **Progress Chart** — skill progress bar chart (mock data)

#### Mock Data (hardcoded, needs backend)
- `STUDY_TASKS` — 5 tasks, 2 done
- `HACKATHONS` — 3 upcoming events
- `INTERNSHIPS` — 4 tracked applications with status

#### GSAP Animations
- All `.bt` tiles animate in on mount: `y:28, scale:0.96` → `y:0, scale:1`, stagger `0.06s`

#### Known Issues
- Resume tile navigates to `/experience` — should navigate to `/resume`
- All data is static mock — no persistence
- `AuthContext` provider dependency: `Dashboard` uses `useAuth()` — needs `AuthProvider` in tree

---

### 7.3 Practice Hub

**Route:** `/practice`
**File:** `src/components/PracticeHub.jsx`
**Status:** ✅ Live with full backend

#### Purpose
Track all LeetCode problems. User manually marks problems as done after solving on LeetCode.

#### Architecture
```
PracticeHub.jsx
    │
    ├── GET /api/practice/lc-problems    → 3800+ problems from cache
    ├── POST /api/practice/user          → ensure user record exists
    ├── GET /api/practice/solved/:id     → user's solved slugs
    └── POST /api/practice/mark         → toggle a problem solved/unsolved
```

#### Key Components (internal to PracticeHub.jsx)
| Component | Purpose |
|---|---|
| `NumberTicker` | Animated number counter |
| `SpotlightCard` | Mouse-tracking spotlight card effect |
| `SyncToast` | Toast notification with spring + swipe dismiss |
| `ProblemRow` | Single problem row with confetti on mark |
| `ProblemList` | AnimatePresence staggered problem list |
| `CategorySidebar` | Left sidebar with layoutId pill active state |

#### User Identity
- No login required. A UUID is auto-generated on first visit: `user_xxxxxxxx`
- Stored in `localStorage` as `nexus_practice_username`
- Also stored in `server/data/nexus-db.json` as a user record

#### Problem Data Flow
1. Server fetches all problems from LeetCode GraphQL API (paginated, 100/page)
2. Response cached in `server/data/lc-problems-cache.json` for 24 hours
3. On cache miss (or first run), fetches fresh (~3800+ problems, ~15–40 seconds)
4. Frontend receives array, renders in virtual-scroll-style paginated list

#### Category System
Problems are grouped by LeetCode topic tags into 4 sidebar groups:
- **Data Structures** — Array, String, Hash Table, Tree, Graph, Heap, etc.
- **Algorithms** — DP, Greedy, BFS/DFS, Backtracking, Binary Search, etc.
- **Math & Logic** — Math, Bit Manipulation, Number Theory, etc.
- **Topics** — Design, Database, Simulation, Shell, etc.
- **Other** — catch-all for any tag not in the above groups

#### Solved Count Logic
- `totalSolved = solvedSlugs.size` — count of problem slugs in user's DB record
- Easy/Medium/Hard breakdown computed by filtering `problems[]` against `solvedSlugs` Set
- Counts start at 0 for new users — increments only via manual checkbox

#### Animations
- Hero badge, title, sub-text: Framer Motion `y` + `opacity` entrance
- Sidebar category pill: `layoutId="active-cat-pill"` so it slides between categories
- Problem row check: micro-burst confetti (`canvas-confetti`)
- Category completion: full celebration burst
- Progress bar: `motion.div` width from 0 → `progressPct%` on mount

---

### 7.4 Study Planner

**Route:** `/study-planner`
**File:** `src/components/StudyPlanner.jsx`
**Status:** ✅ Live (all data mock/hardcoded)

#### Purpose
Visual weekly schedule builder with integrated Pomodoro timer. Helps students balance university, self-learning, interview prep, and project work.

#### Key UI Sections
1. **Week Timeline** — Mon–Sun vertical timeline (8AM–11PM), draggable blocks
2. **Pomodoro Timer** — from `PomodoroContext`, shows session progress
3. **Urgent Tasks** — deadline-based alerts
4. **AI Suggestions** — smart scheduling nudges (mock)
5. **Backlog** — parked tasks to be scheduled

#### Block Categories
| Type | Color | Label |
|---|---|---|
| `academic` | `#3b82f6` | University |
| `self-learning` | `#8b5cf6` | Self-Learning |
| `interview` | `#10b981` | Interview Prep |
| `event` | `#f97316` | Events/Builds |

#### Pomodoro Integration
- Timer state lives in `PomodoroContext` (wraps this route only)
- Work: 25 min, Break: 5 min
- Break popup + Resume popup appear on timer completion
- `totalStudySeconds` accumulates during the session

#### Mock Data
- `DEFAULT_BLOCKS` — 14 pre-filled week blocks
- `URGENT_TASKS` — 2 deadline tasks
- `AI_SUGGESTIONS` — 3 suggested schedule nudges
- `BACKLOG_ITEMS` — Tasks not yet scheduled

---

### 7.5 Aim Page

**Route:** `/aim`
**File:** `src/components/AimPage.jsx`
**Status:** ✅ Live (AI is mocked with `setTimeout` delays)

#### Purpose
AI-powered career gap analysis. User inputs target role + company, uploads their resume PDF, enters GitHub username → receives a personalised roadmap with skill gaps, radar chart, and weekly tasks.

#### Data Inputs
| Input | Source | Processing |
|---|---|---|
| Target Role | Dropdown (Backend, Frontend, ML, etc.) | Mapped to `ROLE_DB` |
| Target Company | Dropdown (Google, Meta, etc.) | Adjusts difficulty modifier |
| Resume PDF | File upload | `pdfjs-dist` extracts text (first 4 pages) |
| GitHub Username | Text input | GitHub REST API → repos, languages, stars |

#### External API Calls (from browser)
```
GitHub REST API:
  GET https://api.github.com/users/:username
  GET https://api.github.com/users/:username/repos?per_page=100&sort=updated
```

#### Mock AI Logic (`mockGenerateRoadmap`)
- Simulates `1500ms` loading delay
- Maps role → `ROLE_DB` entry (skills acquired/missing, base score, radar data, tasks)
- Company modifier adds ±points to match score
- Returns: `{ acquired[], missing[], match_score, weeks_to_ready, radar[], tasks[], weekly_plan[] }`

#### Role Database (`ROLE_DB`)
Supports: `backend`, `frontend`, `ml`, `fullstack`, `devops`, `mobile`

#### Key UI Sections
1. **Input Panel** — role, company, resume upload, GitHub connect
2. **Radar Chart** — `recharts` RadarChart comparing current vs required skill levels
3. **Skill Gap List** — acquired skills (green) + missing skills (red) with action items
4. **Weekly Plan** — day-by-day study plan for first 2 weeks
5. **Task Checklist** — actionable daily tasks

#### Resume Connection Point
AimPage currently has its own PDF upload. When the Resume Builder is built, this should be able to **import a resume directly from the Resume Builder** instead of re-uploading.

---

### 7.6 Experience Hub

**Route:** `/experience-hub`
**File:** `src/components/ExperiencePage.jsx`
**Status:** ✅ Live (hub/landing page only)

#### Purpose
Landing page that routes users to either the Internships page or Hackathons page. Features 3D tilt cards, parallax hero, and animated feature lists.

#### UI Features
- `TiltCard` — custom 3D CSS perspective tilt on hover
- Scroll-based parallax on hero using `framer-motion`'s `useScroll` + `useTransform`
- Mouse-driven orb parallax effect
- `TargetCursor` — custom cursor active on this page

#### Navigation Targets
- "Explore Internships" → `/internships`
- "Browse Hackathons" → `/hackathons`

---

### 7.7 Guidance Page

**Route:** `/guidance`
**File:** `src/components/GuidancePage.jsx`
**Status:** ✅ Live (static dossier data)

#### Purpose
Library of career dossiers — detailed accounts of how real engineers got hired at top companies. Features a terminal/hacker-aesthetic card grid.

#### Dossier Data (hardcoded)
12 dossiers covering: Google, Microsoft, Stripe, Meta, Amazon, Airbnb, Netflix, Apple, Palantir, Figma, Snowflake, Citadel

Each dossier has:
```js
{
  id: string,           // URL slug e.g. 'alex-sde-google'
  name: string,
  initials: string,
  hue: string,          // accent color
  status: 'HIRED' | 'OFFER' | 'INTERVIEW',
  role: string,
  company: string,
  totalTime: string,    // preparation time
  skills: string[],
  category: 'swe' | 'ml' | 'devops' | 'product' | 'design' | 'mobile',
  batch: '2025' | '2026'
}
```

#### UI Features
- Terminal aesthetic: `>` prompt, `STATUS: HIRED` in neon green
- Crosshair corner decorators on each card
- Category filter tabs: all / swe / ml / devops / product / design / mobile
- Framer Motion `whileInView` staggered entrance

---

### 7.8 Guidance Story

**Route:** `/guidance/:id`
**File:** `src/components/GuidanceStory.jsx`
**Status:** ✅ Live

#### Purpose
Full detail view of a single career dossier. Accessed from the Guidance Page by clicking a dossier card.

#### Data
- Reads `id` from URL params
- Looks up the full story content (hardcoded in `GuidanceStory.jsx`)
- Includes: timeline, interview rounds breakdown, resources used, tips

---

### 7.9 Placement Portal

**Route:** `/placement-portal`
**File:** `src/components/PLacementPortal.jsx`
**Status:** ✅ Live (all links are external)

#### Purpose
Aggregated directory of job/internship/hackathon platforms. Not a job board itself — it links out to external platforms with smart search URL templating.

#### Platform Data Structure
```js
{
  id: number,
  category: 'jobs' | 'internships' | 'hackathons' | 'freelance',
  featured: boolean,
  name: string,
  tagline: string,
  description: string,
  tags: string[],
  listings: string,       // e.g. "10M+ jobs"
  color: string,          // brand color
  emoji: string,
  baseUrl: string,        // platform homepage
  searchUrl: string,      // search URL template with {q} placeholder
}
```

#### Platform List Includes
LinkedIn Jobs, Naukri, Wellfound, Internshala, Glassdoor, Indeed, TopHire, Unstop, LeetCode Careers, DevFolio, GitHub Jobs, etc.

#### Interaction
- Search bar: replaces `{q}` in `searchUrl` and opens new tab
- Filter by category tabs
- "Visit Platform" button → `baseUrl` in new tab
- "Search Jobs" button → `searchUrl` with current query in new tab

---

### 7.10 Internships

**Route:** `/internships`
**File:** `src/components/Internships.jsx`
**Status:** ✅ Live (static data)

#### Purpose
Curated internship listings with company, role, stipend, deadline, and apply link.

#### Data Shape (each listing)
```js
{
  company: string,
  role: string,
  stipend: string,
  duration: string,
  deadline: string,
  tags: string[],
  applyUrl: string
}
```

---

### 7.11 Hackathons

**Route:** `/hackathons`
**File:** `src/components/Hackathons.jsx`
**Status:** ✅ Live (static data)

#### Purpose
Upcoming hackathon listings with prize pool, dates, team size, and registration link.

---

### 7.12 Whiteboard

**Routes:** `/whiteboard` and `/whiteboard/:canvasId`
**Files:** `src/components/Whiteboard.jsx`, `src/components/WhiteboardCanvas.jsx`
**Status:** ✅ Live

#### Purpose
Free-draw canvas for system design diagrams, algorithm visualisation, and interview prep sketching.

#### `/whiteboard`
- Lists existing canvas sessions (browser-local storage)
- "New Canvas" button creates a UUID-based canvas session
- Navigates to `/whiteboard/:canvasId`

#### `/whiteboard/:canvasId`
- Full canvas drawing surface
- Tech stencils (predefined shapes: server, database, load balancer, etc.)
- Toolbar: pen, shapes, text, eraser, color picker
- Data persisted to `localStorage` keyed by `canvasId`

---

### 7.13 Resume Builder (Planned)

**Route:** `/resume` (NOT YET REGISTERED IN App.jsx)
**File:** `src/components/ResumeBuilder.jsx` (NOT YET CREATED)
**CSS:** `src/styles/ResumeBuilder.css` (EXISTS — preserved from earlier design)
**Status:** ❌ Not built

#### Connections to Other Modules

| Module | Connection |
|---|---|
| **Navbar** | "Resume" link → `/resume` already set |
| **Home** (bento card) | "Resume" bento currently → `/aim` — must fix to `/resume` |
| **Dashboard** | Resume tile currently → `/experience` — must fix to `/resume` |
| **AimPage** | Has PDF upload for AI roadmap — future: import built resume instead of re-uploading |

#### What Needs to Be Built
1. `src/components/ResumeBuilder.jsx` component
2. Register `/resume` route in `src/App.jsx`
3. Fix Home bento card `onClick` from `/aim` → `/resume`
4. Fix Dashboard tile `navigate('/experience')` → `navigate('/resume')`
5. (Future) AimPage "Link Resume" button → reads from Resume Builder store instead of file upload

#### Suggested Architecture
- **Sections**: Personal Info, Education, Experience, Projects, Skills, Achievements
- **Live Preview**: Side-by-side editor + PDF preview
- **Templates**: 2–3 ATS-friendly layouts
- **Export**: PDF download via `pdfjs-dist` or `html2canvas` + `jsPDF`
- **Storage**: `localStorage` (no server needed initially)
- **AimPage Bridge**: Store resume text in a context or `localStorage` key that AimPage can read directly

---

### 7.14 Project Workspace

**Route:** `/project-workspace`
**File:** `src/ProjectWorkspace.jsx`
**Status:** ✅ Live

#### Purpose
Showcase and document student projects. Displays project case studies with tech stack, code links, demo links, and auto-generated documentation structure.

---

## 8. Backend API Reference

Base URL (local): `http://localhost:3001`
Vite proxy: `/api/*` → `http://localhost:3001`

All request bodies: `Content-Type: application/json`
All responses: `Content-Type: application/json`

---

### `GET /api/health`
Health check.
**Response:** `{ status: 'ok', time: ISO_STRING }`

---

### `GET /api/practice/lc-problems`
Returns all LeetCode problems. Serves from 24h file cache if fresh, otherwise fetches from LeetCode GraphQL API (paginated, 100/page).

**Response:**
```json
{
  "problems": [
    {
      "id": 1,
      "title": "Two Sum",
      "title_slug": "two-sum",
      "difficulty": "Easy",
      "category": "Array",
      "tags": ["Array", "Hash Table"],
      "paid_only": false,
      "ac_rate": 51,
      "leetcode_url": "https://leetcode.com/problems/two-sum/"
    }
  ],
  "source": "cache" | "leetcode" | "fallback",
  "total": 3859
}
```

**Cache:** `server/data/lc-problems-cache.json`, TTL 24h  
**Fallback:** Returns curated 350-problem list from `server/data/problems.json`

---

### `GET /api/practice/problems`
Returns the curated 350-problem fallback list (kept for backwards compatibility).

**Response:** `{ problems: [...] }`

---

### `POST /api/practice/user`
Upsert a user record. Creates if `nexusUsername` doesn't exist.

**Body:** `{ nexusUsername: string, leetcodeUsername?: string | null }`  
**Response:** `{ user: { id, nexus_username, leetcode_username, last_synced_at } }`

---

### `GET /api/practice/solved/:nexusUsername`
Get all problem slugs marked as solved by a user.

**Response:**
```json
{
  "user": { "id": 1, "nexus_username": "user_abc123", ... },
  "solvedSlugs": ["two-sum", "add-two-numbers"]
}
```

---

### `POST /api/practice/mark`
Toggle a single problem solved/unsolved.

**Body:** `{ nexusUsername: string, slug: string, solved: boolean }`  
**Validation:** slug must match `/^[a-z0-9]+(-[a-z0-9]+)*$/`  
**Response:** `{ solvedSlugs: string[] }` — full updated solved list

---

### `POST /api/practice/sync` *(Legacy — LeetCode submission import)*
Fetches recent AC submissions from LeetCode and stores them. Now less relevant since the flow is manual-mark-only.

**Body:** `{ nexusUsername: string, leetcodeUsername: string }`  
**Strategy 1:** `alfa-leetcode-api.onrender.com` (limit 500)  
**Strategy 2:** LeetCode GraphQL `recentAcSubmissionList` (limit ~20 recent)  
**Response:** `{ solvedSlugs, newThisSync, newSlugsArray, source, user }`

---

### `PUT /api/practice/lc-username`
Update a user's linked LeetCode username.

**Body:** `{ nexusUsername: string, leetcodeUsername: string }`  
**Response:** `{ user }`

---

### `GET /api/practice/streak/:leetcodeUsername`
Fetch LeetCode daily streak from `alfa-leetcode-api`.

**Response:** `{ streak: number | null, username: string }`

---

## 9. Database Design

### Storage: `server/data/nexus-db.json`

Plain JSON file. Loaded into memory on server start. Written synchronously on every mutation via `fs.writeFileSync`.

```json
{
  "_nextUserId": 3,
  "users": [
    {
      "id": 1,
      "nexus_username": "user_ydu03e28",
      "leetcode_username": "sankalp_sharma23",
      "last_synced_at": "2026-03-01T11:52:03.454Z"
    }
  ],
  "user_solved_problems": [
    {
      "user_id": 1,
      "problem_slug": "two-sum",
      "solved_at": "2026-03-01T10:53:21.166Z"
    }
  ]
}
```

### Schema

#### `users`
| Field | Type | Notes |
|---|---|---|
| `id` | integer | Auto-increment via `_nextUserId` |
| `nexus_username` | string | UUID e.g. `user_abc12345`; from localStorage |
| `leetcode_username` | string \| null | Optional LeetCode handle |
| `last_synced_at` | ISO string \| null | Last time `/sync` was called |

#### `user_solved_problems`
| Field | Type | Notes |
|---|---|---|
| `user_id` | integer | FK → `users.id` |
| `problem_slug` | string | LeetCode title slug e.g. `two-sum` |
| `solved_at` | ISO string | Timestamp of mark |

### `db.js` API (ORM layer)
| Function | Description |
|---|---|
| `getUser(nexusUsername)` | Find user by nexus username |
| `upsertUser(nexusUsername, lcUsername?)` | Create or update user |
| `updateLcUsername(nexusUsername, lcUsername)` | Update LeetCode handle |
| `updateLastSync(nexusUsername)` | Stamp `last_synced_at` |
| `updateUserLcStats(...)` | Store verified LC solve counts (currently unused) |
| `getSolvedSlugs(nexusUsername)` | Return array of solved slugs |
| `insertSolved(nexusUsername, slug)` | Mark one problem solved |
| `deleteSolved(nexusUsername, slug)` | Unmark one problem |
| `insertManySolved(nexusUsername, slugs[])` | Bulk insert (deduped) |
| `isValidSlug(slug)` | Check against curated 350 set (legacy) |

### LeetCode Problem Cache: `server/data/lc-problems-cache.json`
```json
{
  "fetched_at": "2026-03-01T12:00:00.000Z",
  "problems": [ /* ~3859 problem objects */ ]
}
```
- TTL: 24 hours
- Auto-deleted/overwritten on cache miss
- Falls back to `problems.json` if LeetCode API fails

---

## 10. External API Integrations

### 10.1 LeetCode GraphQL API
**Called from:** `server/routes/practice.js`  
**Endpoint:** `https://leetcode.com/graphql`  
**Method:** POST

#### Query 1: Problem List (paginated)
```graphql
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      acRate
      difficulty
      frontendQuestionId: questionFrontendId
      paidOnly: isPaidOnly
      title
      titleSlug
      topicTags { name slug }
    }
  }
}
```
- Page size: 100 (LeetCode hard cap)
- Fetches all pages in parallel batches of 5
- Total ~3859 problems as of March 2026

#### Query 2: Recent AC Submissions (legacy sync)
```graphql
query recentAcSubmissionList($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id title titleSlug timestamp
  }
}
```
- Limit param: 50 (LeetCode hard cap ~20 unique)

---

### 10.2 GitHub REST API
**Called from:** `src/components/AimPage.jsx` (browser-side)  
**No auth token** — uses public API (60 req/hr per IP)

```
GET https://api.github.com/users/:username
GET https://api.github.com/users/:username/repos?per_page=100&sort=updated
```

**Data extracted:**
- `publicRepos` — repo count
- `topLangs` — top 6 languages by repo count
- `recentRepos` — last 4 repos with name, stars, language

---

### 10.3 alfa-leetcode-api *(Third-party, legacy)*
**Called from:** `server/routes/practice.js`  
**Base:** `https://alfa-leetcode-api.onrender.com`

| Endpoint | Purpose |
|---|---|
| `/:username/acSubmission?limit=500` | Bulk AC submissions |
| `/userProfile/:username` | Streak + total solved |

> ⚠️ This is a free public API on a hobby server — may be slow or unavailable. Used as Strategy 1 in the sync flow. Not critical to current mark-based flow.

---

## 11. State Management

### Pattern: Local component state + React Context

Nexus uses no global state library (no Redux, Zustand, etc.). State is managed at the component level with two Contexts:

| Context | Scope | Contains |
|---|---|---|
| `AuthContext` | App-wide (but provider not mounted globally) | `user`, `login()`, `logout()`, `isAuthenticated` |
| `PomodoroContext` | `/study-planner` route only | Timer state, start/stop/skip/reset |

### localStorage Keys
| Key | Used By | Value |
|---|---|---|
| `nexus_practice_username` | PracticeHub | UUID string e.g. `user_abc12345` |

### Session-only State (lost on refresh)
- All Dashboard data (tasks, internships, hackathons)
- Study Planner blocks and Pomodoro timer
- AimPage roadmap results
- Whiteboard canvas data (persisted to localStorage per canvasId)

---

## 12. Known Gaps & Pending Work

### Critical
| # | Issue | File | Fix |
|---|---|---|---|
| 1 | `/resume` route not registered | `App.jsx` | Add `<Route path="/resume" element={<ResumeBuilder />} />` |
| 2 | `ResumeBuilder.jsx` component doesn't exist | — | Build from scratch |
| 3 | Home bento "Resume" card routes to `/aim` | `Home.jsx:428` | Change to `/resume` |
| 4 | Dashboard Resume tile routes to `/experience` | `Dashboard.jsx:226` | Change to `/resume` |

### Architecture
| # | Issue | Notes |
|---|---|---|
| 5 | `AuthProvider` not wrapping the app | `Dashboard` uses `useAuth()` but Provider isn't in `App.jsx` — any new page calling `useAuth()` will crash |
| 6 | No real auth system | Demo user hardcoded — user resets on refresh |
| 7 | JSON flat-file store not scalable | Works for MVP; migrate to SQLite or PostgreSQL for multi-user production |
| 8 | All Dashboard/StudyPlanner/Hackathon data is hardcoded mock | Needs backend endpoints |

### UX / Data
| # | Issue | Notes |
|---|---|---|
| 9 | Server must be manually started | No `concurrently` script — must run `npm run dev` AND `node server/index.js` separately |
| 10 | First-load of Practice Hub is slow | 15–40s on cache miss while LeetCode pages are fetched — needs loading state messaging |
| 11 | LC problem cache can serve stale paid_only problems | No filter for paid-only problems in the UI |
| 12 | GuidanceStory content is all hardcoded | No CMS or DB backing — hard to add new stories |
| 13 | Internship/Hackathon data is static | Needs a data source or admin input |

---

## 13. Cross-Module Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     USER / BROWSER                               │
│                                                                  │
│  localStorage:                                                   │
│    nexus_practice_username  →  used by PracticeHub               │
│    whiteboard_canvas_*      →  used by WhiteboardCanvas          │
│                                                                  │
│  Future (Resume Builder):                                        │
│    nexus_resume_data        →  used by ResumeBuilder + AimPage   │
└──────────────────────────────────────────────────────────────────┘

Practice Hub ──── POST /api/practice/mark ──────► nexus-db.json
                   GET /api/practice/solved       ◄──────────────

AimPage ─────────── GitHub REST API (browser) ──► GitHub
         └────────── pdfjs-dist (browser) ──────► local PDF file

Future:
  ResumeBuilder ──► localStorage/nexus_resume_data ──► AimPage reads it
  Dashboard ──────► GET /api/practice/solved ────────► show real solved count
  StudyPlanner ───► POST /api/study/blocks ──────────► (endpoint not built)
```

### Data Connections That Should Be Built Next
1. **Resume Builder → AimPage**: share resume text via `localStorage` or Context so AimPage doesn't require re-upload
2. **Practice Hub → Dashboard**: Dashboard should query `/api/practice/solved/:id` to show real solved count instead of hardcoded mock
3. **StudyPlanner → Backend**: persist blocks to server so they survive refreshes
4. **auth**: Once real auth exists, all `nexus_username` UUID keys get replaced with actual user IDs

---

*Document maintained by the Nexus Technical PM Team. Update this document whenever a new feature is added, a route changes, a backend endpoint is added/modified, or a data schema evolves.*
