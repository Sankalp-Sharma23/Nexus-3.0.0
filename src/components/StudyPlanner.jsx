import { useState } from 'react';
import { Calendar, Clock, BookOpen, Brain, Target, TrendingUp, Play, Pause, RotateCcw, Users, Zap, CheckCircle2, Circle, Eye } from 'lucide-react';
import { usePomodoro } from '../contexts/PomodoroContext';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/StudyPlanner.css';

const StudyPlanner = () => {
  const [dailyProgress, setDailyProgress] = useState(2);
  const [dailyGoal] = useState(4);
  const {
    mode,
    isRunning,
    secondsLeft,
    showBreakPopup,
    showResumePopup,
    totalStudySeconds,
    startWork,
    startBreak,
    skipBreak,
    pause,
    resume,
    reset,
    setShowBreakPopup,
    setShowResumePopup,
  } = usePomodoro();
  const [activeStudents] = useState(247);

  // Sample subjects data
  const subjects = [
    {
      id: 1,
      name: 'DBMS',
      progress: 60,
      status: 'In Progress',
      daysToExam: 12,
      color: '#3b82f6'
    },
    {
      id: 2,
      name: 'Operating Systems',
      progress: 45,
      status: 'In Progress',
      daysToExam: 18,
      color: '#8b5cf6'
    },
    {
      id: 3,
      name: 'Computer Networks',
      progress: 30,
      status: 'Not Started',
      daysToExam: 25,
      color: '#10b981'
    },
    {
      id: 4,
      name: 'Algorithm Design',
      progress: 75,
      status: 'Revised',
      daysToExam: 8,
      color: '#f59e0b'
    }
  ];

  // Sample agenda items
  const agendaItems = [
    {
      id: 1,
      time: '10:00 AM',
      title: 'Practice Linked Lists',
      type: 'dsa',
      link: '/whiteboard',
      duration: '1 hour'
    },
    {
      id: 2,
      time: '11:30 AM',
      title: 'DBMS - Normalization Practice',
      type: 'lecture',
      link: null,
      duration: '1.5 hours'
    },
    {
      id: 3,
      time: '02:00 PM',
      title: 'LeetCode Daily Challenge',
      type: 'leetcode',
      link: '/whiteboard',
      duration: '45 mins'
    },
    {
      id: 4,
      time: '04:00 PM',
      title: 'OS - Process Scheduling Review',
      type: 'lecture',
      link: null,
      duration: '1 hour'
    }
  ];

  const [notes, setNotes] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Revised':
        return <CheckCircle2 size={16} />;
      case 'In Progress':
        return <Eye size={16} />;
      case 'Not Started':
        return <Circle size={16} />;
      default:
        return <Circle size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Revised':
        return 'status-revised';
      case 'In Progress':
        return 'status-progress';
      case 'Not Started':
        return 'status-not-started';
      default:
        return '';
    }
  };

  return (
    <div className="study-planner-page">
      <Navbar theme="dark" />
      
      <div className="study-planner-container">
        {/* Header - The Focus Zone */}
        <header className="focus-zone-header">
          <div className="focus-status">
            <div className="status-indicator">
              <div className="pulse-dot"></div>
              <span className="status-text">Focus Mode: Active</span>
            </div>
            <h1 className="welcome-message">
              Welcome back, <span className="username">Scholar</span>
            </h1>
          </div>
          
          <p className="focus-subtitle">
            What would you like to do today? Finish a syllabus module or crush a LeetCode streak?
          </p>

          {/* Daily Goal Progress */}
          <div className="daily-goal-section">
            <div className="goal-header">
              <span className="goal-label">
                <Target size={18} />
                Today's Study Goal
              </span>
              <span className="goal-value">{dailyProgress}/{dailyGoal} hours completed</span>
            </div>
            <div className="goal-progress-bar">
              <div 
                className="goal-progress-fill" 
                style={{ width: `${(dailyProgress / dailyGoal) * 100}%` }}
              ></div>
            </div>
          </div>
        </header>

        {/* Three Column Layout */}
        <div className="three-column-layout">
          
          {/* Column A: Syllabus Tracker */}
          <aside className="syllabus-tracker">
            <div className="section-header">
              <BookOpen size={24} />
              <h3 className="section-title">My Subjects</h3>
            </div>

            <div className="subjects-grid">
              {subjects.map((subject) => (
                <div key={subject.id} className="subject-card">
                  <div className="subject-header">
                    <h4 className="subject-name">{subject.name}</h4>
                    <span className={`status-badge ${getStatusColor(subject.status)}`}>
                      {getStatusIcon(subject.status)}
                      {subject.status}
                    </span>
                  </div>
                  
                  <div className="subject-progress">
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${subject.progress}%`, backgroundColor: subject.color }}
                      ></div>
                    </div>
                    <span className="progress-percentage">{subject.progress}%</span>
                  </div>

                  <div className="exam-countdown">
                    <Clock size={14} />
                    <span>Exam in {subject.daysToExam} days</span>
                  </div>
                </div>
              ))}
            </div>
            {/* ...existing code... */}
          </aside>

          {/* Column B: Interactive Calendar / Agenda */}
          <section className="agenda-calendar">
            <div className="section-header">
              <Calendar size={24} />
              <h2 className="section-title">Today's Agenda</h2>
              <span className="current-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>

            <div className="agenda-timeline">
              {agendaItems.map((item) => (
                <div key={item.id} className={`agenda-item ${item.type}`}>
                  <div className="time-marker">
                    <Clock size={16} />
                    <span className="time-text">{item.time}</span>
                  </div>
                  
                  <div className="agenda-content">
                    <div className="agenda-details">
                      <h4 className="agenda-title">{item.title}</h4>
                      <span className="agenda-duration">{item.duration}</span>
                    </div>
                    
                    {item.link && (
                      <Link to={item.link} className="nexus-link">
                        <Zap size={16} />
                        Launch in Nexus
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Study Block Button */}
            <button className="add-block-btn">
              <span className="material-symbols-rounded">add_circle</span>
              Add Study Block
            </button>

            {/* AI Study Buddy (moved to column 2, icon and title removed) */}
            <div className="ai-study-buddy">
              <div className="ai-input-group">
                <input
                  type="text"
                  className="ai-input"
                  placeholder="Ask me anything... e.g., 'Explain ACID properties'"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                />
                <button className="ai-submit-btn">
                  <span className="material-symbols-rounded">send</span>
                </button>
              </div>
              <div className="ai-quick-actions">
                <button className="quick-action">Summarize topic</button>
                <button className="quick-action">Generate quiz</button>
              </div>
            </div>

            {/* Brain Dump (Quick Notes) as separate glass card below agenda */}
            <div className="quick-notes" style={{marginTop: '2rem'}}>
              <div className="notes-header">
                <span className="material-symbols-rounded">sticky_note_2</span>
                <h4 className="notes-title">Brain Dump</h4>
              </div>
              <textarea
                className="notes-textarea"
                placeholder="Jot down quick thoughts, questions, or topics to review later..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </section>

          {/* Column C: Brain Dump & Resources */}
          <aside className="resources-panel">
            
            {/* Pomodoro Timer */}

            <div className="pomodoro-timer">
              <div className="timer-header">
                <Brain size={20} />
                <h4 className="timer-title">Deep Work Timer</h4>
              </div>
              <div className="timer-display">
                <span className="timer-text">{formatTime(secondsLeft)}</span>
              </div>
              <div className="timer-controls">
                <button onClick={isRunning ? pause : resume} className="timer-btn primary">
                  {isRunning ? <Pause size={18} /> : <Play size={18} />}
                  {isRunning ? 'Pause' : 'Start'}
                </button>
                <button onClick={reset} className="timer-btn secondary">
                  <RotateCcw size={18} />
                </button>
              </div>
              <div className="timer-info">
                <span className="material-symbols-rounded">lightbulb</span>
                <span>{mode === 'work' ? '25 min focus, 5 min break' : 'Break time!'}</span>
              </div>
              <div className="timer-stats" style={{marginTop: '10px', color: '#8b5cf6', fontWeight: 600}}>
                Total Studied: {(totalStudySeconds/3600).toFixed(2)} hrs
              </div>
            </div>

            {/* Break Popup */}
            {showBreakPopup && (
              <div className="pomodoro-popup">
                <div className="popup-content">
                  <h3>Time for a break!</h3>
                  <p>Take a 5 min break.</p>
                  <button className="timer-btn primary" onClick={startBreak}>Start Break</button>
                  <button className="timer-btn secondary" onClick={skipBreak}>Skip Break</button>
                </div>
              </div>
            )}
            {/* Resume Popup */}
            {showResumePopup && (
              <div className="pomodoro-popup">
                <div className="popup-content">
                  <h3>Break over!</h3>
                  <p>Get back to study.</p>
                  <button className="timer-btn primary" onClick={startWork}>Start 25 min Focus</button>
                </div>
              </div>
            )}

            {/* Peer Heatmap */}
            <div className="peer-heatmap">
              <div className="heatmap-header">
                <Users size={20} />
                <h4 className="heatmap-title">Study Squad</h4>
              </div>
              
              <div className="active-count">
                <div className="pulse-indicator"></div>
                <span className="count-number">{activeStudents}</span>
                <span className="count-label">students studying now</span>
              </div>

              <div className="heatmap-visual">
                {[...Array(7)].map((_, dayIndex) => (
                  <div key={dayIndex} className="heatmap-day">
                    {[...Array(5)].map((_, blockIndex) => (
                      <div 
                        key={blockIndex} 
                        className="heatmap-block"
                        style={{ 
                          opacity: Math.random() * 0.8 + 0.2,
                          backgroundColor: '#8b5cf6'
                        }}
                      ></div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="heatmap-caption">Community activity this week</p>
            </div>

          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StudyPlanner;
