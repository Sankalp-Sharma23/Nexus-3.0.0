# Nexus Project - Complete Flow Guide

A comprehensive walkthrough from entry point to every page, with code explanations.

---

## 📍 SECTION 1: ENTRY POINT & APP INITIALIZATION

### 1.1 `index.html` — The Bootstrap File

```html
<!doctype html>
<html lang="en">
<head>
  <!-- Metadata for SEO & mobile responsiveness -->
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Nexus - An integrated career-engineering ecosystem..." />

  <!-- Load Google Fonts (Inter, Outfit) & Material Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <title>Nexus - Career Engineering Ecosystem</title>
</head>

<body>
  <!-- Single div where React will mount the entire app -->
  <div id="root"></div>
  <!-- Load React entrypoint module -->
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

**What happens:**
1. Browser loads HTML
2. Finds `<div id="root"></div>` — this is where React renders
3. Loads `/src/main.jsx` which bootstraps the React app

---

### 1.2 `src/main.jsx` — React App Initialization

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import './styles/index.css'
import App from './App.jsx'

// Create React root and render the app
createRoot(document.getElementById('root')).render(
  // StrictMode: Highlights potential issues during development
  <StrictMode>
    {/* BrowserRouter: Enables client-side routing (no page reloads) */}
    <BrowserRouter>
      {/* AuthProvider: Makes auth state available globally (login/logout/user info) */}
      <AuthProvider>
        {/* ToastProvider: Makes toast notifications available globally */}
        <ToastProvider>
          {/* Main App component with all routes */}
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

**Provider Stack (executed bottom-up):**
1. **BrowserRouter** — Enables routing (URL changes without page reload)
2. **AuthProvider** — Stores user login state, makes it available to all pages
3. **ToastProvider** — Enables toast notifications (success/error messages)
4. **App** — Main component with all page routes

---

### 1.3 `src/App.jsx` — Route Configuration

```jsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';

/* ── Lazy loading: Each page loads only when user visits it (faster initial load) ───── */
const Home            = lazy(() => import('./components/Home'));
const Dashboard       = lazy(() => import('./components/Dashboard.jsx'));
const PlacementPortal = lazy(() => import('./components/PLacementPortal.jsx'));
const Whiteboard      = lazy(() => import('./components/Whiteboard.jsx'));
// ... more pages loaded lazily

/* Fallback loader shown while page is downloading */
function PageLoader() {
  return <div style={{ minHeight: '100vh', background: '#0a0a0f' }} />;
}

function App() {
  return (
    <ErrorBoundary>
      {/* Auto scroll to top when route changes */}
      <ScrollToTop />
      {/* Show PageLoader while new page JS is downloading */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── PUBLIC ROUTES (No login required) ── */}
          <Route path="/"       element={<Home />} />
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* ── PROTECTED ROUTES (Requires login, redirects to /login if not authenticated) ── */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/practice"   element={<ProtectedRoute><PracticeHub /></ProtectedRoute>} />
          <Route path="/whiteboard" element={<ProtectedRoute><Whiteboard /></ProtectedRoute>} />
          <Route path="/study-planner" element={<ProtectedRoute>
            <PomodoroProvider><StudyPlanner /></PomodoroProvider>
          </ProtectedRoute>} />

          {/* ... more protected routes ... */}

          {/* Catch-all 404 route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Key concepts:**
- **Lazy loading**: Pages only download when needed (faster app startup)
- **ProtectedRoute**: Checks if user is logged in before rendering page
- **ErrorBoundary**: Catches React errors and displays fallback UI
- **Suspense**: Shows loading UI while page JS is downloading

---

## 📍 SECTION 2: CONTEXT PROVIDERS (Global State Management)

### 2.1 AuthContext — User Login & State

**What it does:** Manages login/signup, stores current user info, checks if user is authenticated

**Usage in pages:** `const { user, isAuthenticated, login, logout } = useAuth()`

**Key features:**
- Stores user ID, name, email, gender, focus area
- Handles login API call
- Redirects to login if trying to access protected page while not logged in
- Falls back to guest user if API is down

---

### 2.2 PomodoroContext — Study Timer State

**What it does:** Manages pomodoro timer for study sessions (work + break cycles)

**Usage:** Only used in `/study-planner` page

---

## 📍 SECTION 3: PUBLIC PAGES (No login needed)

### 3.1 HOME PAGE (`/`) — Landing Page

**File:** `src/components/Home.jsx`

```jsx
const Home = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-container">
      {/* Navigation bar at top */}
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      {/* SECTION 1: Landing Banner — Hero section with "From Zero to Hero" */}
      <section className="landing-banner">
        <h1>From Zero to Hero <span className="gradient-text"> in One Ecosystem</span></h1>
        <p>Stop juggling 7 platforms. One intelligent system: Learn → Architect → Build → Optimize → Land</p>

        {/* Show different CTAs based on login status */}
        {isAuthenticated ? (
          <>
            <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
            <button onClick={() => navigate('/practice')}>Practice Now</button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('/login')}>Start Your Journey</button>
            <button onClick={() => navigate('/signup')}>Create Account</button>
          </>
        )}

        {/* Floating cards showing: Learn, Architect, Build, Optimize, Land, Code, Goals, AI Agent */}
        <div className="banner-visual">
          {/* 8 floating cards arranged in circle, connected to central NEXUS logo */}
        </div>
      </section>

      {/* SECTION 2: Problem Section — Shows 4 problems students face */}
      <section className="problem-section">
        {/* Fragmentation of Effort */}
        {/* The Forgetting Curve */}
        {/* Context Loss */}
        {/* Resource Overload */}
      </section>

      {/* SECTION 3: Solution Section — Shows 3 solutions Nexus provides */}
      <section className="solution-section">
        {/* Unified Feedback Loop */}
        {/* Smart Memory System */}
        {/* Dream Company Ecosystem */}
      </section>

      {/* SECTION 4: Dream Company Flow — 5-step timeline */}
      <section className="dream-company-section">
        {/* Step 1: Select Your Target */}
        {/* Step 2: System Audit */}
        {/* Step 3: Resource Curation */}
        {/* Step 4: Auto-Schedule */}
        {/* Step 5: Resume Optimization */}
      </section>

      {/* SECTION 5: Bento Grid — 9 main tools/pages user can access */}
      <section className="bento-section">
        {/* Dashboard, Practice Hub, Whiteboard, Study Planner */}
        {/* Experience Hub, Placement Portal, Resume, Guidance, Aim */}

        {/* When user clicks a bento card: */}
        <div onClick={(e) => handleBentoClick(e, '/dashboard')}>
          {/* Trigger portal animation from click point */}
          {/* Navigate to that page */}
        </div>
      </section>

      {/* SECTION 6: Final CTA — Call to action with stats */}
      <section className="cta-section">
        <h2>Stop Grinding. Start Engineering.</h2>
        <p>Join engineers who replaced 7 scattered tools with one intelligent system</p>
        {/* Show signup/login buttons or dashboard buttons if already logged in */}
      </section>

      {/* Footer */}
      <Footer />
      {/* Portal transition animation component */}
      <PortalTransition ref={portalRef} />
    </div>
  );
};
```

**Flow:**
1. User lands on home page (public, no login required)
2. Shows hero section with problem → solution → features
3. Shows 9 main tools in bento grid layout
4. If user clicks a feature:
   - If logged in: Navigate to that feature page
   - If not logged in: Navigate to login page
5. Has portal/portal transition animation when clicking

---

### 3.2 LOGIN PAGE (`/login`)

**File:** `src/components/LoginPage.jsx`

```jsx
export default function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    // If already logged in, redirect to dashboard
    useEffect(() => {
        if (isAuthenticated) navigate('/dashboard', { replace: true });
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate fields
        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }

        setLoading(true);

        // Call login API
        const result = await login(email, password);

        if (result.success) {
            // Login successful → redirect to dashboard
            toast.success('Welcome back!');
            navigate('/dashboard', { replace: true });
        } else {
            // Login failed → show error or create guest user if API is down
            if (result.error?.includes('Failed to fetch')) {
                // API is down, create guest user
                const userData = {
                    id: Date.now().toString(),
                    name: email.split('@')[0], // Extract name from email
                };
                login(userData);
                navigate('/dashboard', { replace: true });
            } else {
                // Show actual error
                setError(result.error || 'Login failed.');
                setLoading(false);
            }
        }
    };

    return (
        <AuthShell mode="login" formPanel={
            <div className="auth-form-panel">
                <h1>Welcome Back</h1>
                <form onSubmit={handleSubmit}>
                    {/* Email input */}
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />

                    {/* Password input */}
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />

                    {/* Forgot password link */}
                    <a href="#" onClick={e => {
                        e.preventDefault();
                        alert('Password reset coming soon!');
                    }}>Forgot Password?</a>

                    {/* Error message display */}
                    {error && <div className="error">{error}</div>}

                    {/* Submit button */}
                    <button type="submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                {/* Link to signup page */}
                <p>Don't have an account? <a href="/signup">Create Account</a></p>
            </div>
        } />
    );
}
```

**Flow:**
1. User enters email & password
2. Click "Sign In" → calls login API
3. If success: navigate to `/dashboard`
4. If API down: create guest user anyway
5. If error: show error message

---

### 3.3 SIGNUP PAGE (Similar to Login)

Similar structure but creates new account instead of logging in.

---

## 📍 SECTION 4: PROTECTED PAGES (Requires login)

All these pages check authentication before showing. If not logged in, user is redirected to `/login`.

### 4.1 DASHBOARD (`/dashboard`) — Mission Control

**File:** `src/components/Dashboard.jsx`

```jsx
export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Get user ID (from different possible locations)
    const userId = user?._id || user?.id || user?.username || 'guest';

    // Fetch dashboard data from API
    const [dashData, setDashData] = useState(null);
    useEffect(() => {
        fetch(`/api/dashboard/${userId}`)
            .then(r => r.json())
            .then(d => setDashData(d))
            .catch(() => {}); // If API fails, use fallback data
    }, [userId]);

    // Extract data with fallbacks
    const name = user?.name || 'Engineer';
    const heroImg = user?.gender === 'female' ? girlImg : boyImg;
    const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase(); // "John Smith" → "JS"

    const studyDone = dashData?.study?.tasksDone || 2;
    const studyTotal = dashData?.study?.tasksTotal || 5;
    const readiness = dashData?.aim?.hireReadiness || 50; // Hiring readiness %
    const hackathons = dashData?.hackathons || []; // List of upcoming hackathons
    const internships = dashData?.internships || []; // List of open internships
    const jobs = dashData?.jobs || []; // List of jobs matching user's aim

    return (
        <div className="dashboard-layout">
            <Navbar />
            <main>
                {/* ── BENTO GRID: 10 cards showing quick access to tools ── */}

                {/* CARD 1: HERO — Left side shows user profile */}
                <div className="hero-card">
                    <img src={heroImg} alt="hero" />
                    <div className="hero-content">
                        <div className="greeting">
                            {getGreeting()} 👋 {/* Good morning/afternoon/evening */}
                        </div>
                        <div className="name">Welcome back, {name}</div>
                        <div className="date">{todayDate} — here's your career snapshot.</div>

                        {/* 3 quick stats */}
                        <div className="stats">
                            <div>{studyDone} Tasks Done</div>
                            <div>{hackathons.length} Hackathons</div>
                            <div>{readiness}% Readiness</div>
                        </div>

                        {/* Skill tags: React, Node.js, DSA, System Design, etc. */}
                        <div className="tags">
                            {skillTags.map(tag => <span key={tag}>{tag}</span>)}
                        </div>
                    </div>
                </div>

                {/* CARD 2: WHITEBOARD — Quick access to whiteboard */}
                <div className="card" onClick={() => navigate('/whiteboard')}>
                    <div className="icon"><Layout /></div>
                    <h3>Whiteboard</h3>
                    <p>Brainstorm, diagram & visualise ideas</p>
                </div>

                {/* CARD 3: STUDY PLANNER — Progress ring + task list */}
                <div className="card" onClick={() => navigate('/study-planner')}>
                    <svg>
                        {/* Circular progress ring: studyDone/studyTotal */}
                        <circle ... strokeDasharray={progress} />
                    </svg>
                    <div className="tasks">
                        {/* Show overdue tasks (red) + upcoming tasks (normal) */}
                        {upcomingTasks.map(task => (
                            <div className={`task ${task.done ? 'done' : ''}`}>
                                <span>{task.label}</span>
                                {task.done && <CheckCircle />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CARD 4: HACKATHONS — List of upcoming hackathons */}
                <div className="card" onClick={() => navigate('/hackathons')}>
                    <h3>Hackathons {hackathons.length > 0 && <Badge>Featured</Badge>}</h3>
                    {hackathons.map(hack => (
                        <div className="hack-item">
                            <div style={{background: hack.color}} /> {/* Color bar */}
                            <div>{hack.name}</div>
                            <div>{hack.date} · {hack.prize}</div>
                            <span>{hack.daysUntil}d</span> {/* Days until event */}
                        </div>
                    ))}
                </div>

                {/* CARD 5: PLACEMENT PORTAL — List of jobs */}
                <div className="card" onClick={() => navigate('/placement-portal')}>
                    <h3>Jobs {aimRole && <Badge>{aimRole}</Badge>}</h3>
                    {jobs.map(job => (
                        <div className="job-row">
                            <div>{job.title}</div>
                            <div>{job.company}</div>
                            <div>{job.type} {job.salary && `· ${job.salary}`}</div>
                        </div>
                    ))}
                </div>

                {/* CARD 6: RESUME BUILDER — Quick access */}
                <div className="card" onClick={() => navigate('/resume-builder')}>
                    <h3>Resume</h3>
                    <div className="pills">PDF Export • ATS Score • Templates</div>
                </div>

                {/* CARD 7: DATABASE BOARD — Create ER diagrams */}
                <div className="card" onClick={() => navigate('/whiteboard', {state: {template: 'schema'}})}>
                    <h3>DB Designer</h3>
                    <p>Design schemas & ER diagrams</p>
                </div>

                {/* CARD 8: COMPONENT ARCHITECT — React component tree */}
                <div className="card" onClick={() => navigate('/whiteboard', {state: {template: 'react'}})}>
                    <h3>Component Architect</h3>
                    <div className="tree">
                        <div>App</div>
                        <div>Header • Router • Footer</div>
                    </div>
                </div>

                {/* CARD 9: INTERNSHIPS — List of internships */}
                <div className="card" onClick={() => navigate('/internships')}>
                    <h3>Internships</h3>
                    {internships.map(int => (
                        <div className="int-row">
                            <div style={{color: int.color}}>{int.company}</div>
                            <div>{int.role}</div>
                            <div>Due: {int.deadline}</div>
                            <span style={{color: int.color}}>{int.status}</span>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
```

**What this page does:**
1. Shows user profile & greeting
2. Displays 3 quick stats: tasks done, hackathons, readiness %
3. Shows 9 quick-access cards to main features:
   - Whiteboard (design/brainstorm)
   - Study Planner (with progress ring)
   - Hackathons (upcoming events)
   - Placement Portal (jobs)
   - Resume Builder
   - DB Designer
   - Component Architect
   - Internships
4. Each card is clickable → navigates to that feature

---

### 4.2 PRACTICE HUB (`/practice`) — DSA Tracking

**What it does:**
- Tracks solved coding problems (LeetCode, HackerRank, etc.)
- Filter by company (Google, Meta, Stripe, etc.)
- Mark as solved when you complete a problem
- Save solution notes/logic notes

**Key features:**
- Problem list with difficulty (Easy/Medium/Hard)
- Company filter dropdown
- "Add Note" button to save solution explanation
- Progress tracking

---

### 4.3 WHITEBOARD (`/whiteboard`) — Real-time Canvas

**What it does:**
- Real-time drawing canvas for system design
- Pre-built stencils (database icons, API endpoints, etc.)
- Sticky notes for annotations
- Can create/save multiple whiteboards
- Share with team members (collaborative editing)

**Key features:**
- Canvas drawing tools (pencil, shapes, text)
- Drag-and-drop tech stencils
- Multiple canvas support
- Real-time collaboration via Socket.io

---

### 4.4 STUDY PLANNER (`/study-planner`) — Time Management

**What it does:**
- Schedule study sessions (with Pomodoro timer)
- Tracks study habits (completed sessions, streak)
- AI spaced repetition (auto-suggests when to review topics)
- Links to curated resources

**Key features:**
- Pomodoro timer (25 min work + 5 min break)
- Task list with due dates
- Study history/calendar
- Linked resources per topic

---

### 4.5 EXPERIENCE PAGE (`/experience-hub`) — Profile Builder

**What it does:**
- Build professional profile
- Add work experience, projects, certifications
- Skill radar (shows skill levels visually)
- Internship & hackathon records

**Key features:**
- Timeline of experiences
- Skill visualization (radar chart)
- Portfolio projects listing
- Achievements/certifications

---

### 4.6 AIM PAGE (`/aim`) — Goal Setting

**What it does:**
- Set target company (e.g., "Google")
- Set target role (e.g., "Senior Backend Engineer")
- Set timeline (e.g., "6 months")
- Nexus auto-aligns all content around this goal

**Key features:**
- Company selector
- Role selector
- Timeline slider
- Auto-updates dashboard with relevant opportunities

---

### 4.7 PLACEMENT PORTAL (`/placement-portal`) — Opportunities

**What it does:**
- Shows job openings
- Mock interview tracking
- Offer tracker
- Auto-matched jobs based on user's aim

**Key features:**
- Job listings (filtered by user's aim)
- Mock interview prep materials
- Offer comparisons
- Application status tracking

---

### 4.8 INTERNSHIPS (`/internships`) — Internship Opportunities

**What it does:**
- Shows open internships
- Filter by company, role, deadline
- Track applications

**Key features:**
- Internship listings
- Company filter
- Application status
- Deadline countdown

---

### 4.9 HACKATHONS (`/hackathons`) — Competitions

**What it does:**
- Shows upcoming hackathons
- Track which ones user is participating in
- Prize info, dates, locations

**Key features:**
- Hackathon listings with dates & prizes
- Filter by country/online
- Registration/participation tracking

---

### 4.10 GUIDANCE (`/guidance`) — Learning Paths

**What it does:**
- Shows pre-built learning paths for different roles
- Curated resources (tutorials, course links)
- Role-specific roadmaps

**Example paths:**
- Full Stack Engineer
- Mobile Engineer
- Data Scientist
- DevOps Engineer

**Features:**
- Step-by-step learning paths
- Resource curation (YouTube, blogs, courses)
- Track completion progress

---

### 4.11 RESUME BUILDER (`/resume-builder`) — ATS Optimization

**What it does:**
- Build & optimize resume
- STAR method guidance (Situation, Task, Action, Result)
- ATS score calculation
- Template selection

**Key features:**
- Drag-to-reorder sections
- Auto-format bullet points with STAR method
- ATS score feedback
- PDF export
- Pre-built templates

---

## 📍 SECTION 5: FLOW SUMMARY

```
User visits nexus.com
        ↓
  Loads index.html
        ↓
  Loads src/main.jsx (React entrypoint)
        ↓
  Providers loaded: BrowserRouter → AuthProvider → ToastProvider → App
        ↓
  App.jsx route configuration
        ↓
    Public Routes:
    / (Home)
    /login (Login)
    /signup (Signup)
        ↓
  User clicks "Start Journey" → redirects to /login
        ↓
  User logs in
        ↓
  AuthContext stores user info
        ↓
    Protected Routes now accessible:
    /dashboard (Mission Control)
    /practice (DSA Tracking)
    /whiteboard (Drawing Canvas)
    /study-planner (Time Management)
    /experience-hub (Profile)
    /aim (Goal Setting)
    /placement-portal (Jobs & Interviews)
    /internships (Internship Listings)
    /hackathons (Hackathons)
    /guidance (Learning Paths)
    /resume-builder (Resume Optimizer)
        ↓
  User navigates between pages
        ↓
  URL changes → Route updates → Component renders
  (No page reload — React handles it client-side)
```

---

## 📍 SECTION 6: KEY TECHNOLOGIES

| Tech | Purpose |
|------|---------|
| **React 19** | UI library (components, state, hooks) |
| **React Router v7** | Client-side routing (URL → Component) |
| **Vite** | Build tool (dev server, bundles JS) |
| **GSAP** | Animations (page transitions, hero effects) |
| **Framer Motion** | Animation library for micro-interactions |
| **Socket.io** | Real-time collaboration (whiteboard) |
| **Lucide React** | Icon library (UI icons) |
| **TailwindCSS** | Styling framework |
| **Three.js** | 3D graphics (if needed) |
| **Recharts** | Data visualization (charts, graphs) |

---

## 📍 SECTION 7: DATA FLOW

### API Calls

**Dashboard data:**
```
GET /api/dashboard/:userId
→ Returns: { study, aim, hackathons, internships, jobs }
```

**Practice problems:**
```
GET /api/practice?company=Google&difficulty=Medium
→ Returns: List of problems
```

**User profile:**
```
GET /api/user/:userId
POST /api/user/:userId (update profile)
```

**Study tasks:**
```
GET /api/study-planner/:userId
POST /api/study-planner/:userId/task (add task)
```

---

## 📍 SECTION 8: USER STATE FLOW

```
1. User NOT logged in
   ↓
   Can see: Home, Login, Signup
   ↓
   Cannot see: Dashboard, Practice, Whiteboard, etc.

2. User clicks "Start Journey"
   ↓
   Redirected to /login

3. User enters credentials
   ↓
   API call: POST /api/auth/login
   ↓
   Success: AuthContext stores user data in localStorage
   ↓
   Redirected to /dashboard

4. User is now logged in
   ↓
   Can see: All protected pages
   ↓
   Each page can access: const { user, logout } = useAuth()

5. User clicks "Logout"
   ↓
   LAuthContext clears user data
   ↓
   Redirected to /login
```

---

## 📍 SECTION 9: COMPONENT HIERARCHY

```
<App>
  └── <Suspense fallback={<PageLoader />}>
    └── <Routes>
      ├── <Route path="/" element={<Home />} />
      ├── <Route path="/login" element={<LoginPage />} />
      ├── <Route path="/signup" element={<SignupPage />} />
      └── <Route path="/dashboard" element={<ProtectedRoute>
          └── <Dashboard />
      └── <Route path="/practice" element={<ProtectedRoute>
          └── <PracticeHub />
      └── <Route path="/whiteboard" element={<ProtectedRoute>
          └── <Whiteboard />
      └── {... more protected routes ...}
```

---

## 📍 SECTION 10: STYLING

**CSS Framework:** TailwindCSS (utility-first CSS)

**Folder structure:**
```
src/
  styles/
    Home.css        (Landing page styles)
    Dashboard.css   (Dashboard grid & cards)
    Auth.css        (Login/Signup form styles)
    AimPageNew.css  (Aim page styles)
    ExperiencePage.css
    PracticeHub.css
    ResumeBuilder.css
    ... more component styles
```

**Key CSS classes used:**
- `.bento-grid` — Dashboard 10-card grid
- `.auth-form` — Login/Signup form
- `.bento-section` — Home page 9-card grid
- `.scroll-animate` — Fade-in animation on scroll
- `.gradient-text` — Gradient text effect

---

## 📍 SECTION 11: PAGE NAVIGATION MAP

```
Home (/)
├── Click "Start Journey" → /login
├── Click "Create Account" → /signup
├── Bento card clicks:
│   ├── Dashboard card → /dashboard
│   ├── Practice card → /practice
│   ├── Whiteboard card → /whiteboard
│   ├── Study Planner card → /study-planner
│   ├── Experience Hub card → /experience-hub
│   ├── Placement Portal card → /placement-portal
│   ├── Resume card → /resume-builder
│   ├── Guidance card → /guidance
│   └── Aim card → /aim

Login (/login)
└── Enter credentials → /dashboard

Signup (/signup)
└── Create account → /dashboard

Dashboard (/dashboard)
├── Card clicks navigate to feature pages
├── Study Planner card → /study-planner
├── Whiteboard card → /whiteboard
├── Hackathons card → /hackathons
├── Placement card → /placement-portal
├── Resume card → /resume-builder
├── Internships card → /internships
└── Navbar links → /Profile, /Guidance, etc.

Practice Hub (/practice)
└── Click problem → Details view

Whiteboard (/whiteboard)
└── Click existing canvas → /whiteboard/:canvasId

Study Planner (/study-planner)
└── Add tasks, start Pomodoro timer

Experience Page (/experience-hub)
└── Add/edit work experience

Placement Portal (/placement-portal)
└── Click job → Details & apply

Internships (/internships)
└── Click internship → Details

Hackathons (/hackathons)
└── Click hackathon → Register

Guidance (/guidance)
└── Click learning path → /guidance/:id
└── Click "Build My Path" → /guidance/build

AIM Page (/aim)
└── Set company & role (updates dashboard)

Resume Builder (/resume-builder)
└── Edit & export resume

PathBuilder (/guidance/build)
└── Create custom learning path

Profile (/profile)
└── Edit user info
```

---

## 🎯 QUICK START FOR DEVELOPERS

1. **To add a new page:**
   - Create component in `src/components/PageName.jsx`
   - Add route in `src/App.jsx` (use `lazy()` for code splitting)
   - If protected: wrap with `<ProtectedRoute>`

2. **To access user data:**
   ```jsx
   const { user, login, logout } = useAuth();
   ```

3. **To show notifications:**
   ```jsx
   const toast = useToast();
   toast.success('message');
   toast.error('message');
   ```

4. **To navigate:**
   ```jsx
   const navigate = useNavigate();
   navigate('/dashboard');
   navigate('/practice', { state: { openId: '123' } });
   ```

5. **To fetch data:**
   ```jsx
   useEffect(() => {
     fetch('/api/data')
       .then(r => r.json())
       .then(d => setData(d));
   }, [userId]);
   ```

---

**End of Project Flow Guide**
