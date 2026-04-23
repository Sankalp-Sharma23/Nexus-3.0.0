// Import React utilities for lazy loading components and suspense
import { lazy, Suspense, useEffect } from 'react';
// Import routing components for defining app routes
import { Routes, Route, Navigate } from 'react-router-dom';
// Import ScrollToTop component to scroll to top on route changes
import ScrollToTop from './components/ScrollToTop';
// Import ErrorBoundary to catch and handle React errors
import ErrorBoundary from './components/ErrorBoundary';
// Import ProtectedRoute to guard routes that require authentication
import ProtectedRoute from './components/ProtectedRoute.jsx';
// Import 404 page for non-existent routes
import NotFoundPage from './pages/NotFoundPage.jsx';
// Import Pomodoro context provider for Study Planner feature
import { PomodoroProvider } from './contexts/PomodoroContext';
import './styles/App.css';

/* ── Heavy page components — each route gets its own JS chunk ───────────── */
/* Lazy loading: Components are loaded only when their route is visited, reducing initial bundle size */
const Home            = lazy(() => import('./components/Home'));  // Landing page
const Dashboard       = lazy(() => import('./components/Dashboard.jsx'));  // Main dashboard
const PlacementPortal = lazy(() => import('./components/PLacementPortal.jsx'));  // Job listings
const Whiteboard      = lazy(() => import('./components/Whiteboard.jsx'));  // Collaborative drawing board list
const WhiteboardCanvas = lazy(() => import('./components/WhiteboardCanvas.jsx'));  // Collaborative drawing interface
const StudyPlanner    = lazy(() => import('./components/StudyPlanner.jsx'));  // Study scheduler with Pomodoro
const ExperiencePage  = lazy(() => import('./components/ExperiencePage.jsx'));  // Jobs and internships hub
const AimPage         = lazy(() => import('./components/AimPage.jsx'));  // Goal setting and tracking
const Internships     = lazy(() => import('./components/Internships.jsx'));  // Internship opportunities
const Hackathons      = lazy(() => import('./components/Hackathons.jsx'));  // Hackathon listings
const GuidancePage    = lazy(() => import('./components/GuidancePage.jsx'));  // Career guidance stories
const GuidanceStory   = lazy(() => import('./components/GuidanceStory.jsx'));  // Individual guidance story detail
const PathBuilder     = lazy(() => import('./components/PathBuilder.jsx'));  // Career path builder
const PracticeHub     = lazy(() => import('./components/PracticeHub.jsx'));  // Coding practice platform
const LoginPage       = lazy(() => import('./components/LoginPage.jsx'));  // User login
const SignupPage      = lazy(() => import('./components/SignupPage.jsx'));  // User registration
const ProfilePage     = lazy(() => import('./pages/ProfilePage.jsx'));  // User profile
const ResumeBuilder   = lazy(() => import('./components/ResumeBuilder.jsx'));  // Resume creation tool

/* Loading fallback component shown while a route chunk is being downloaded */
function PageLoader() {
  return <div style={{ minHeight: '100vh', background: '#0a0a0f' }} />;
}

/* Main App component: Sets up routing, error handling, and app-level context providers */
function App() {
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.source === 'JSON') {
          console.warn('%c⚠️ USING LOCAL JSON FALLBACK DATA', 'color: orange; font-weight: bold; font-size: 14px;');
        } else if (data.source === 'MongoDB') {
          console.log('%c☁️ Using Cloud MongoDB Data', 'color: #34a853; font-weight: bold;');
        }
      })
      .catch(() => {});
  }, []);

  return (
    // ErrorBoundary: Catches any React errors in child components
    <ErrorBoundary>
      {/* ScrollToTop: Scrolls page to top when route changes */}
      <ScrollToTop />
      {/* Suspense: Shows fallback (PageLoader) while lazy components load */}
      <Suspense fallback={<PageLoader />}>
        {/* Routes: Define all app routes */}
        <Routes>
          {/* Public routes - accessible without authentication */}
          <Route path="/"       element={<Home />} />
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes - redirect to /login if not authenticated */}
          <Route path="/dashboard"        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/placement-portal" element={<ProtectedRoute><PlacementPortal /></ProtectedRoute>} />
          <Route path="/whiteboard"       element={<ProtectedRoute><Whiteboard /></ProtectedRoute>} />
          {/* Dynamic route for specific whiteboard canvas */}
          <Route path="/whiteboard/:canvasId" element={<ProtectedRoute><WhiteboardCanvas /></ProtectedRoute>} />
          {/* Study Planner wrapped with PomodoroProvider for timer state management */}
          <Route path="/study-planner"    element={<ProtectedRoute>
            <PomodoroProvider><StudyPlanner /></PomodoroProvider>
          </ProtectedRoute>} />
          <Route path="/experience-hub"  element={<ProtectedRoute><ExperiencePage /></ProtectedRoute>} />
          <Route path="/internships"     element={<ProtectedRoute><Internships /></ProtectedRoute>} />
          <Route path="/hackathons"      element={<ProtectedRoute><Hackathons /></ProtectedRoute>} />
          <Route path="/aim"             element={<ProtectedRoute><AimPage /></ProtectedRoute>} />
          <Route path="/guidance"        element={<ProtectedRoute><GuidancePage /></ProtectedRoute>} />
          <Route path="/guidance/build"  element={<ProtectedRoute><PathBuilder /></ProtectedRoute>} />
          {/* Dynamic route for individual guidance story */}
          <Route path="/guidance/:id"    element={<ProtectedRoute><GuidanceStory /></ProtectedRoute>} />
          <Route path="/practice"        element={<ProtectedRoute><PracticeHub /></ProtectedRoute>} />
          {/* Redirect old practice-hub URL to new /practice route */}
          <Route path="/practice-hub"    element={<Navigate to="/practice" replace />} />
          <Route path="/profile"         element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/resume-builder"  element={<ProtectedRoute><ResumeBuilder /></ProtectedRoute>} />

          {/* 404 catch-all: Matches any route not defined above */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;