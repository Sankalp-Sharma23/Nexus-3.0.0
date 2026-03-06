import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Home from './components/Home';
import ScrollToTop from './components/ScrollToTop';
import './styles/App.css';
import Dashboard from './components/Dashboard.jsx';
import PlacementPortal from './components/PLacementPortal.jsx';
import Whiteboard from './components/Whiteboard.jsx';
import WhiteboardCanvas from './components/WhiteboardCanvas.jsx';
import ExperienceRadar from './components/ExperienceRadar.jsx';
import StudyPlanner from './components/StudyPlanner.jsx';
import ExperiencePage from './components/ExperiencePage.jsx';
import AimPage from './components/AimPage.jsx';
import Internships from './components/Internships.jsx';
import Hackathons from './components/Hackathons.jsx';
import { PomodoroProvider } from './contexts/PomodoroContext';
import ProjectWorkspace from './ProjectWorkspace.jsx';
import GuidancePage from './components/GuidancePage.jsx';
import GuidanceStory from './components/GuidanceStory.jsx';
import PathBuilder from './components/PathBuilder.jsx';
import PracticeHub from './components/PracticeHub.jsx';
import ResumeBuilder from './components/ResumeBuilder.jsx';

function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
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
      </Routes>
    </>
  );
}

export default App;