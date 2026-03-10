import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/App.css';
import Dashboard from './components/Dashboard.jsx';
import PlacementPortal from './components/PLacementPortal.jsx';
import Whiteboard from './components/Whiteboard.jsx';
import WhiteboardCanvas from './components/WhiteboardCanvas.jsx';
import StudyPlanner from './components/StudyPlanner.jsx';
import ExperiencePage from './components/ExperiencePage.jsx';
import AimPage from './components/AimPage.jsx';
import Internships from './components/Internships.jsx';
import Hackathons from './components/Hackathons.jsx';
import { PomodoroProvider } from './contexts/PomodoroContext';
import GuidancePage from './components/GuidancePage.jsx';
import GuidanceStory from './components/GuidanceStory.jsx';
import PathBuilder from './components/PathBuilder.jsx';
import PracticeHub from './components/PracticeHub.jsx';
<<<<<<< HEAD
import LoginPage from './components/LoginPage.jsx';
import SignupPage from './components/SignupPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
=======
>>>>>>> 7106ba6d9e621709ca6cf9ef709dcaf47cba7d58
import ResumeBuilder from './components/ResumeBuilder.jsx';

function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
<<<<<<< HEAD
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes — redirect to /login if not authenticated */}
        <Route path="/dashboard"       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/placement-portal" element={<ProtectedRoute><PlacementPortal /></ProtectedRoute>} />
        <Route path="/whiteboard"       element={<ProtectedRoute><Whiteboard /></ProtectedRoute>} />
        <Route path="/whiteboard/:canvasId" element={<ProtectedRoute><WhiteboardCanvas /></ProtectedRoute>} />
        <Route path="/study-planner"    element={<ProtectedRoute>
          <PomodoroProvider><StudyPlanner /></PomodoroProvider>
        </ProtectedRoute>} />
        <Route path="/experience-hub"  element={<ProtectedRoute><ExperiencePage /></ProtectedRoute>} />
        <Route path="/internships"     element={<ProtectedRoute><Internships /></ProtectedRoute>} />
        <Route path="/hackathons"      element={<ProtectedRoute><Hackathons /></ProtectedRoute>} />
        <Route path="/aim"             element={<ProtectedRoute><AimPage /></ProtectedRoute>} />
        <Route path="/guidance"        element={<ProtectedRoute><GuidancePage /></ProtectedRoute>} />
        <Route path="/guidance/build"  element={<ProtectedRoute><PathBuilder /></ProtectedRoute>} />
        <Route path="/guidance/:id"    element={<ProtectedRoute><GuidanceStory /></ProtectedRoute>} />
        <Route path="/practice"        element={<ProtectedRoute><PracticeHub /></ProtectedRoute>} />
        <Route path="/practice-hub"    element={<Navigate to="/practice" replace />} />
        <Route path="/profile"         element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/resume-builder"  element={<ProtectedRoute><ResumeBuilder /></ProtectedRoute>} />

        {/* 404 catch-all */}
        <Route path="*" element={<NotFoundPage />} />
=======
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/placement-portal" element={<PlacementPortal />} />
        <Route path="/whiteboard" element={<Whiteboard />} />
        <Route path="/whiteboard/:canvasId" element={<WhiteboardCanvas />} />
        <Route path="/experience-radar" element={<ExperienceRadar />} />
        <Route path="/study-planner" element={
          <PomodoroProvider>
            <StudyPlanner />
          </PomodoroProvider>
        } />
        <Route path="/experience-hub" element={<ExperiencePage />} />
        <Route path="/internships" element={<Internships />} />
        <Route path="/hackathons" element={<Hackathons />} />
        <Route path="/aim" element={<AimPage />} />
        <Route path="/project-workspace" element={<ProjectWorkspace />} />
        <Route path="/guidance" element={<GuidancePage />} />
        <Route path="/guidance/build" element={<PathBuilder />} />
        <Route path="/guidance/:id" element={<GuidanceStory />} />
        <Route path="/practice" element={<PracticeHub />} />
        <Route path="/practice-hub" element={<Navigate to="/practice" replace />} />
        <Route path="/resume" element={<ResumeBuilder />} />
>>>>>>> 7106ba6d9e621709ca6cf9ef709dcaf47cba7d58
      </Routes>
    </ErrorBoundary>
  );
}

export default App;