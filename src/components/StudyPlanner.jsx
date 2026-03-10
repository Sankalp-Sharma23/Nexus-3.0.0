import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Users, Flame, BarChart2,
  Sparkles, X, CheckCircle2, Circle,
  Plus, Trash2, Clock, BookOpen, Brain, Coffee,
  ChevronDown, ChevronUp,
  Loader2, AlertCircle,
  Calendar, ChevronLeft, ChevronRight, Bell,
  BookMarked, GraduationCap, Pencil, ListTodo,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import socket from '../socket';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/StudyPlanner.css';

/* ─── API helper ─────────────────────────────────────────────────────────── */
const API = '/api/study';
const apiFetch = async (path, opts = {}) => {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
};

/* ─── Timer mode config ──────────────────────────────────────────────────── */
const TIMER_MODES = {
  focus:      { label: 'Focus',       seconds: 25 * 60, color: '#8b5cf6', sessionType: 'focus' },
  shortBreak: { label: 'Short Break', seconds:  5 * 60, color: '#10b981', sessionType: 'short-break' },
  longBreak:  { label: 'Long Break',  seconds: 15 * 60, color: '#3b82f6', sessionType: 'long-break' },
};

/* ─── Subject presets ────────────────────────────────────────────────────── */
const PRESET_SUBJECTS = [
  'DSA', 'System Design', 'Math', 'Computer Science',
  'Operating Systems', 'Databases', 'Web Dev',
  'Machine Learning', 'Algorithms', 'Other',
];

/* ─── Priority colours ───────────────────────────────────────────────────── */
const PRIORITY = {
  low:    { color: '#64748b' },
  medium: { color: '#f59e0b' },
  high:   { color: '#ef4444' },
};

/* ─── Task / event type config ───────────────────────────────────────────── */
const TASK_TYPES = {
  learning:  { label: 'Learning',  color: '#8b5cf6', icon: GraduationCap },
  homework:  { label: 'Homework',  color: '#3b82f6', icon: Pencil },
  practice:  { label: 'Practice',  color: '#10b981', icon: ListTodo },
  revision:  { label: 'Revision',  color: '#f59e0b', icon: BookMarked },
  other:     { label: 'Other',     color: '#64748b', icon: BookOpen },
};

/* ─── Calendar event preset colours ─────────────────────────────────────── */
const EVENT_COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899'];

/* ─── Time-overlap helpers ───────────────────────────────────────────────── */
const toMins = t => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
const eventsOverlap = (a, b) =>
  a.date === b.date &&
  toMins(a.startTime) < toMins(b.endTime) &&
  toMins(b.startTime) < toMins(a.endTime);

/* ─── Calendar helpers ───────────────────────────────────────────────────── */
const WEEK_HOURS  = Array.from({ length: 17 }, (_, i) => i + 6); // 6am – 10pm
const HOUR_PX     = 56;
const CAL_TOP_OFF = 64; // header row height px

function getMondayOf(date) {
  const d   = new Date(date);
  const dow = d.getDay() || 7;         // Sun = 7
  d.setDate(d.getDate() - (dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function toISO(d) { return d.toISOString().split('T')[0]; }
function timeToMins(t = '00:00') {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minsToTime(m) {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
function minsToTop(minutes) {
  return (minutes / 60 - 6) * HOUR_PX + CAL_TOP_OFF;
}
function durationToHeight(minutes) {
  return Math.max(24, (minutes / 60) * HOUR_PX);
}

/* ─── Heatmap colour scale ───────────────────────────────────────────────── */
const heatColor = (min) => {
  if (min === 0)  return 'var(--sp-bg3)';
  if (min < 25)   return 'rgba(139,92,246,0.22)';
  if (min < 60)   return 'rgba(139,92,246,0.48)';
  if (min < 120)  return 'rgba(139,92,246,0.72)';
  return '#8b5cf6';
};

/* ─── Build 52-week grid from flat 365-day array ─────────────────────────── */
const buildWeeks = (heatmap) => {
  if (!heatmap.length) return [];
  const firstDow = new Date(heatmap[0].date).getDay(); // 0=Sun
  const cells    = Array(firstDow).fill(null).concat(heatmap);
  const weeks    = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

/* ─── Web Audio beep ─────────────────────────────────────────────────────── */
const playBeep = () => {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.4);
  } catch (_) {}
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function StudyPlanner() {
  const { user } = useAuth();
  const userId   = user
    ? (user._id || user.id || user.username || user.email || 'guest')
    : null;

  /* ── Timer ───────────────────────────────────────────────────────────── */
  const [timerMode,   setTimerMode]   = useState('focus');
  const [secondsLeft, setSecondsLeft] = useState(TIMER_MODES.focus.seconds);
  const [isRunning,   setIsRunning]   = useState(false);
  const [timerRing,   setTimerRing]   = useState(false);
  const intervalRef     = useRef(null);
  const sessionStartRef = useRef(null);
  const secsRunRef      = useRef(0);

  /* ── Tasks ───────────────────────────────────────────────────────────── */
  const [tasks,        setTasks]        = useState([]);
  const [activeTaskId, setActiveTaskId] = useState('');
  const [taskFilter,   setTaskFilter]   = useState('pending');
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [addForm,      setAddForm]      = useState({
    title: '', subject: 'DSA', customSubject: '',
    dueDate: '', priority: 'medium', estimatedPomodoros: 2, type: 'learning',
  });
  const [savingTask,   setSavingTask]   = useState(false);

  /* ── Analytics ───────────────────────────────────────────────────────── */
  const [todayStats, setTodayStats] = useState({
    totalFocusMinutes: 0, tasksCompleted: 0, currentStreak: 0, sessionCount: 0,
  });
  const [heatmap, setHeatmap] = useState([]);

  /* ── Live count ──────────────────────────────────────────────────────── */
  const [liveCount, setLiveCount] = useState(0);

  /* ── Toast ───────────────────────────────────────────────────────────── */
  const [toast, setToast] = useState(null);
  const showToast = useCallback((text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3800);
  }, []);

  /* ── Tabs ────────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' | 'calendar' | 'reminders'

  /* ── Calendar ────────────────────────────────────────────────────────── */
  const [weekStart,         setWeekStart]         = useState(() => getMondayOf(new Date()));
  const [calEvents,         setCalEvents]          = useState([]);
  const [calLoading,        setCalLoading]         = useState(false);
  const [showAddEventModal, setShowAddEventModal]  = useState(false);
  const [selectedEvent,     setSelectedEvent]       = useState(null);
  const [newEventForm,      setNewEventForm]       = useState({
    title: '', subject: 'DSA', type: 'learning',
    date: toISO(new Date()), startTime: '09:00', endTime: '10:00',
    color: '#8b5cf6',
  });

  /* ── Drag-to-reschedule ─────────────────────────────────────────────── */
  const dragRef      = useRef(null);   // mutable drag state – no re-render on move
  const calEventsRef = useRef([]);     // kept in sync with calEvents
  const calBodyRef   = useRef(null);   // scrollable calendar body ref
  const [dragPreview, setDragPreview] = useState(null);
  useEffect(() => { calEventsRef.current = calEvents; }, [calEvents]);

  /* ── Reminders ───────────────────────────────────────────────────────── */
  const [reminders,     setReminders]     = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  /* ── Load on mount ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!userId) return;
    const uid = encodeURIComponent(userId);
    Promise.all([
      apiFetch('/tasks?userId=' + uid),
      apiFetch('/analytics/today?userId=' + uid),
      apiFetch('/analytics/heatmap?userId=' + uid),
      apiFetch('/reminders?userId=' + uid),
    ])
      .then(([t, s, h, r]) => {
        setTasks(t.tasks       || []);
        setTodayStats(s);
        setHeatmap(h.heatmap   || []);
        setReminders(r.reminders || []);
      })
      .catch(err => console.warn('[StudyPlanner] load:', err.message));
  }, [userId]);

  /* ── Reload calendar events when week changes ───────────────────────── */
  useEffect(() => {
    if (!userId) return;
    const uid = encodeURIComponent(userId);
    const start = toISO(weekStart);
    const end   = toISO(addDays(weekStart, 6));
    setCalLoading(true);
    apiFetch(`/events?userId=${uid}&startDate=${start}&endDate=${end}`)
      .then(d => setCalEvents(d.events || []))
      .catch(() => {})
      .finally(() => setCalLoading(false));
  }, [userId, weekStart]);

  /* ── Socket ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = ({ count }) => setLiveCount(count);
    socket.on('study:count', handler);
    return () => socket.off('study:count', handler);
  }, []);

  /* ── Drag-to-reschedule global handlers ─────────────────────────────── */
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragRef.current || !calBodyRef.current) return;
      const { ev, offsetY, startX, startY } = dragRef.current;
      // threshold: ignore tiny movements so simple clicks open the modal
      if (!dragRef.current.hasMoved) {
        if (Math.abs(e.clientX - startX) < 8 && Math.abs(e.clientY - startY) < 8) return;
        dragRef.current.hasMoved = true;
      }
      // Find which day column the cursor is over
      const cols = calBodyRef.current.querySelectorAll('[data-date]');
      let newDateStr = dragRef.current.newDateStr;
      let colTopAbs  = dragRef.current.colTopAbs;
      for (const col of cols) {
        const r = col.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right) {
          newDateStr = col.dataset.date;
          colTopAbs  = r.top;
          break;
        }
      }
      // Y inside column → snap to 15-min grid
      const scrollTop = calBodyRef.current.scrollTop;
      const rawY      = e.clientY - colTopAbs + scrollTop - offsetY;
      const rawMins   = (rawY / HOUR_PX + 6) * 60;
      const duration  = ev.durationMinutes || 60;
      const snapped   = Math.max(6 * 60, Math.min(22 * 60 - duration, Math.round(rawMins / 15) * 15));
      dragRef.current.snappedMins = snapped;
      dragRef.current.newDateStr  = newDateStr;
      dragRef.current.colTopAbs   = colTopAbs;
      setDragPreview({
        _id: ev._id, dateStr: newDateStr,
        top: (snapped / 60 - 6) * HOUR_PX,
        height: durationToHeight(duration),
        startTime: minsToTime(snapped),
        endTime:   minsToTime(snapped + duration),
        color: ev.color, title: ev.title,
      });
    };

    const onMouseUp = async () => {
      if (!dragRef.current) return;
      const { ev, snappedMins, newDateStr, hasMoved } = dragRef.current;
      dragRef.current = null;
      setDragPreview(null);
      // click (no drag movement) → open detail modal
      if (!hasMoved) { setSelectedEvent(ev); return; }
      if (snappedMins === undefined) return;
      if (snappedMins === toMins(ev.startTime) && newDateStr === ev.date) return;
      const duration     = ev.durationMinutes || 60;
      const newStartTime = minsToTime(snappedMins);
      const newEndTime   = minsToTime(snappedMins + duration);
      const updated      = { ...ev, date: newDateStr, startTime: newStartTime, endTime: newEndTime };
      const clash = calEventsRef.current.find(e => e._id !== ev._id && eventsOverlap(e, updated));
      if (clash) {
        showToast(`Time clash with "${clash.title}"`, 'error');
        return;
      }
      setCalEvents(prev => prev.map(e => e._id === ev._id ? updated : e));
      try {
        await apiFetch('/event/' + ev._id, {
          method: 'PUT',
          body: JSON.stringify({ userId, date: newDateStr, startTime: newStartTime, endTime: newEndTime }),
        });
      } catch (_) {
        setCalEvents(prev => prev.map(e => e._id === ev._id ? ev : e));
        showToast('Failed to move event', 'error');
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* ── Timer tick ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            handleTimerComplete();
            return TIMER_MODES[timerMode].seconds;
          }
          secsRunRef.current += 1;
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  /* ── Timer helpers ───────────────────────────────────────────────────── */
  const handleStart = () => {
    if (!userId) { showToast('Please log in to use the Study Planner', 'error'); return; }
    sessionStartRef.current = Date.now();
    secsRunRef.current = 0;
    setIsRunning(true);
    if (timerMode === 'focus') socket.emit('study:start', { userId });
  };

  const handlePause = () => {
    setIsRunning(false);
    if (timerMode === 'focus') socket.emit('study:stop', { userId });
  };

  const handleReset = useCallback(() => {
    if (timerMode === 'focus' && secsRunRef.current >= 60 && sessionStartRef.current) {
      logSession(Math.round(secsRunRef.current / 60), 'focus', false);
    }
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimerRing(false);
    setSecondsLeft(TIMER_MODES[timerMode].seconds);
    secsRunRef.current = 0;
    sessionStartRef.current = null;
    socket.emit('study:stop', { userId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerMode, userId]);

  const handleModeChange = (mode) => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimerMode(mode);
    setSecondsLeft(TIMER_MODES[mode].seconds);
    secsRunRef.current = 0;
    sessionStartRef.current = null;
    socket.emit('study:stop', { userId });
  };

  const handleTimerComplete = () => {
    setIsRunning(false);
    playBeep();
    setTimerRing(true);
    setTimeout(() => setTimerRing(false), 2500);

    const mode = timerMode;
    const mins = TIMER_MODES[mode].seconds / 60;

    if (mode === 'focus') {
      socket.emit('study:stop', { userId });
      logSession(mins, 'focus', true);
      showToast('🎉 Focus session complete! +' + mins + ' min logged', 'success');
    } else {
      showToast('Break over — ready for the next session?', 'info');
    }
    secsRunRef.current = 0;
    sessionStartRef.current = null;
  };

  const logSession = async (durationMinutes, sessionType, wasCompleted) => {
    if (!userId || durationMinutes < 1) return;
    const now   = Date.now();
    const start = sessionStartRef.current || (now - durationMinutes * 60000);
    try {
      await apiFetch('/session', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          taskId:          activeTaskId || null,
          durationMinutes: Math.round(durationMinutes),
          sessionType,
          wasCompleted,
          startTime: new Date(start).toISOString(),
          endTime:   new Date(now).toISOString(),
        }),
      });
      const uid = encodeURIComponent(userId);
      const s   = await apiFetch('/analytics/today?userId=' + uid);
      setTodayStats(s);
      if (sessionType === 'focus' && activeTaskId && wasCompleted) {
        setTasks(prev => prev.map(t =>
          t._id === activeTaskId ? { ...t, actualPomodoros: (t.actualPomodoros || 0) + 1 } : t
        ));
      }
    } catch (err) {
      console.warn('[StudyPlanner] session log:', err.message);
    }
  };

  /* ── Task CRUD ───────────────────────────────────────────────────────── */
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!addForm.title.trim()) return;
    setSavingTask(true);
    try {
      const subject = (addForm.subject === 'Other' && addForm.customSubject.trim())
        ? addForm.customSubject.trim()
        : addForm.subject;
      const { task } = await apiFetch('/task', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          title:              addForm.title.trim(),
          subject,
          dueDate:            addForm.dueDate || null,
          priority:           addForm.priority,
          estimatedPomodoros: Number(addForm.estimatedPomodoros),
          type:               addForm.type || 'learning',
        }),
      });
      setTasks(prev => [task, ...prev]);
      setAddForm({ title: '', subject: 'DSA', customSubject: '', dueDate: '', priority: 'medium', estimatedPomodoros: 2, type: 'learning' });
      setShowAddForm(false);
      showToast('Task added', 'success');
    } catch (err) {
      showToast('Failed to add task', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const task = tasks.find(t => t._id === taskId);
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      await apiFetch('/task/' + taskId, {
        method: 'PUT',
        body: JSON.stringify({ userId, status: newStatus }),
      });
      if (newStatus === 'completed') {
        setTodayStats(prev => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
        showToast('Task completed! ✓', 'success');
        // Reload reminders if this was a learning task (backend auto-creates them)
        if (!task || task.type === 'learning' || !task.type) {
          const uid = encodeURIComponent(userId);
          apiFetch('/reminders?userId=' + uid)
            .then(d => setReminders(d.reminders || []))
            .catch(() => {});
        }
      }
    } catch (_) {
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: currentStatus } : t));
    }
  };

  const handleDeleteTask = async (taskId) => {
    setTasks(prev => prev.filter(t => t._id !== taskId));
    try {
      await apiFetch('/task/' + taskId + '?userId=' + encodeURIComponent(userId), { method: 'DELETE' });
    } catch (_) {}
  };

  /* ── Calendar CRUD ───────────────────────────────────────────────────── */
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventForm.title.trim()) return;
    // Prevent overlapping events
    const clash = calEvents.find(ev => eventsOverlap(ev, newEventForm));
    if (clash) {
      showToast(`Time clash with "${clash.title}" (${clash.startTime}–${clash.endTime})`, 'error');
      return;
    }
    try {
      const { event } = await apiFetch('/event', {
        method: 'POST',
        body: JSON.stringify({ userId, ...newEventForm }),
      });
      setCalEvents(prev => [...prev, event]);
      setShowAddEventModal(false);
      setNewEventForm({ title: '', subject: 'DSA', type: 'learning', date: toISO(new Date()), startTime: '09:00', endTime: '10:00', color: '#8b5cf6' });
      showToast('Event added to calendar', 'success');
    } catch (err) {
      showToast('Failed to add event', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    setCalEvents(prev => prev.filter(e => e._id !== eventId));
    setSelectedEvent(prev => prev?._id === eventId ? null : prev);
    try {
      await apiFetch('/event/' + eventId + '?userId=' + encodeURIComponent(userId), { method: 'DELETE' });
    } catch (_) {}
  };

  const handleToggleEventDone = async (ev) => {
    const updated = { ...ev, completed: !ev.completed };
    setCalEvents(prev => prev.map(e => e._id === ev._id ? updated : e));
    setSelectedEvent(prev => prev?._id === ev._id ? updated : prev);
    try {
      await apiFetch('/event/' + ev._id, {
        method: 'PUT',
        body: JSON.stringify({ userId, completed: updated.completed }),
      });
    } catch (_) {}
  };


  /* ── Reminders ─────────────────────────────────────────────────────── */
  const handleMarkReminder = async (id, status) => {
    setReminders(prev => prev.filter(r => r._id !== id));
    try {
      await apiFetch('/reminder/' + id, {
        method: 'PUT',
        body: JSON.stringify({ userId, status }),
      });
    } catch (_) {}
  };

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const mode      = TIMER_MODES[timerMode];
  const totalSecs = mode.seconds;
  const progress  = (totalSecs - secondsLeft) / totalSecs;
  const mins      = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs      = String(secondsLeft % 60).padStart(2, '0');

  // Due date bounds: today → today + 1 month
  const _now      = new Date();
  const _maxDate  = new Date(_now);
  _maxDate.setMonth(_maxDate.getMonth() + 1);
  const todayISO  = _now.toISOString().split('T')[0];
  const maxDateISO = _maxDate.toISOString().split('T')[0];

  const filteredTasks = tasks.filter(t =>
    taskFilter === 'all'       ? true :
    taskFilter === 'completed' ? t.status === 'completed' :
    t.status !== 'completed'
  );

  const heatmapWeeks = buildWeeks(heatmap);

  // Calendar week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group calendar events by date
  const eventsByDate = calEvents.reduce((acc, ev) => {
    (acc[ev.date] = acc[ev.date] || []).push(ev);
    return acc;
  }, {});

  // Pending reminders count
  const pendingReminders    = reminders.filter(r => r.status === 'pending');
  const overdueReminders    = pendingReminders.filter(r => new Date(r.dueAt) < _now);
  const dueTodayReminders   = pendingReminders.filter(r => {
    const d = new Date(r.dueAt); return d >= _now && toISO(d) === todayISO;
  });
  const upcomingReminders   = pendingReminders.filter(r => {
    const d = new Date(r.dueAt); return d >= _now && toISO(d) !== todayISO;
  });

  /* ── SVG circle progress ─────────────────────────────────────────────── */
  const R    = 88;
  const circ = 2 * Math.PI * R;

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════ */
  return (
    <div className="sp-page">
      <Navbar />

      <div className="sp-root">
        {/* Page header */}
        <div className="sp-header">
          <div>
            <h1 className="sp-page-title">
              <BookOpen size={20} /> Study Planner
            </h1>
            <p className="sp-page-sub">Deep work sessions · tracked &amp; analysed.</p>
          </div>
          {liveCount > 0 && (
            <span className="sp-live-badge">
              <span className="sp-live-dot" />
              <Users size={12} /> {liveCount} studying now
            </span>
          )}
        </div>

        {/* Tab navigation */}
        <div className="sp-tabs">
          {[
            { id: 'timer',     icon: Brain, label: 'Timer & Tasks' },
            { id: 'reminders', icon: Bell,  label: 'Reminders' },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id}
              className={'sp-tab' + (activeTab === id ? ' sp-tab--active' : '')}
              onClick={() => setActiveTab(id)}>
              <Icon size={14} /> {label}
              {id === 'reminders' && pendingReminders.length > 0 && (
                <span className="sp-tab-badge">{pendingReminders.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══ TAB: Timer & Tasks + Calendar ════════════════════════════ */}
        {activeTab === 'timer' && (
          <div className="sp-split">

          {/* ── LEFT: Timer + Tasks ─────────────────────────────────────── */}
          <div className="sp-left">

            {/* Timer card */}
            <div
              className={'sp-timer-card' + (timerRing ? ' sp-timer-ring' : '')}
              style={{ '--tm-color': mode.color }}
            >
              {/* Mode tabs */}
              <div className="sp-mode-tabs">
                {Object.entries(TIMER_MODES).map(([key, m]) => (
                  <button
                    key={key}
                    className={'sp-mode-tab' + (timerMode === key ? ' sp-mode-tab--active' : '')}
                    style={timerMode === key
                      ? { color: m.color, borderColor: m.color + '55', background: m.color + '18' }
                      : {}}
                    onClick={() => handleModeChange(key)}
                  >
                    {key === 'focus' ? <Brain size={11} /> : <Coffee size={11} />}
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Clock SVG */}
              <div className="sp-clock-wrap">
                <svg viewBox="0 0 216 216" className="sp-clock-svg">
                  <circle cx="108" cy="108" r={R} fill="none"
                    stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
                  <circle cx="108" cy="108" r={R} fill="none"
                    stroke={mode.color} strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - progress)}
                    transform="rotate(-90 108 108)"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                  <text x="108" y="100" textAnchor="middle"
                    className="sp-clock-time" fill={mode.color}>
                    {mins}:{secs}
                  </text>
                  <text x="108" y="122" textAnchor="middle"
                    className="sp-clock-label" fill="rgba(255,255,255,0.42)">
                    {mode.label.toUpperCase()}
                  </text>
                </svg>
              </div>

              {/* Controls */}
              <div className="sp-timer-controls">
                {!isRunning
                  ? <button className="sp-btn-play" onClick={handleStart} style={{ background: mode.color }}>
                      <Play size={17} fill="white" /> Start
                    </button>
                  : <button className="sp-btn-pause" onClick={handlePause}>
                      <Pause size={17} /> Pause
                    </button>
                }
                <button className="sp-btn-reset" onClick={handleReset} title="Reset timer">
                  <RotateCcw size={15} />
                </button>
              </div>

              {/* Link to task */}
              <div className="sp-task-link">
                <label className="sp-task-link-label"><ListTodo size={11} /> Linked task</label>
                <select className="sp-task-link-select"
                  value={activeTaskId}
                  onChange={e => setActiveTaskId(e.target.value)}>
                  <option value="">— none —</option>
                  {tasks.filter(t => t.status !== 'completed').map(t => (
                    <option key={t._id} value={t._id}>[{t.subject}] {t.title}</option>
                  ))}
                </select>
              </div>

              {/* Today stats */}
              <div className="sp-today-stats">
                <div className="sp-stat">
                  <Clock size={12} style={{ color: mode.color }} />
                  <span className="sp-stat-val">{todayStats.totalFocusMinutes}</span>
                  <span className="sp-stat-lbl">min</span>
                </div>
                <div className="sp-stat-div" />
                <div className="sp-stat">
                  <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                  <span className="sp-stat-val">{todayStats.tasksCompleted}</span>
                  <span className="sp-stat-lbl">done</span>
                </div>
                <div className="sp-stat-div" />
                <div className="sp-stat">
                  <Flame size={12}
                    style={{ color: todayStats.currentStreak > 0 ? '#f59e0b' : '#475569' }} />
                  <span className="sp-stat-val">{todayStats.currentStreak}</span>
                  <span className="sp-stat-lbl">streak</span>
                </div>
              </div>
            </div>

            {/* Tasks card */}
            <div className="sp-tasks-card">
              <div className="sp-tasks-header">
                <span className="sp-tasks-title">
                  <CheckCircle2 size={14} /> Tasks
                </span>
                <div className="sp-tasks-header-right">
                  <div className="sp-filter-tabs">
                    {[['pending','Active'],['all','All'],['completed','Done']].map(([val, lbl]) => (
                      <button key={val}
                        className={'sp-filter-tab' + (taskFilter === val ? ' sp-filter-tab--active' : '')}
                        onClick={() => setTaskFilter(val)}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <button className="sp-add-btn" onClick={() => setShowAddForm(v => !v)}>
                    {showAddForm ? <X size={13} /> : <Plus size={13} />}
                  </button>
                </div>
              </div>

              {/* Add form */}
              {showAddForm && (
                <form className="sp-add-form" onSubmit={handleAddTask}>
                  <input className="sp-input" placeholder="Task title *" autoFocus
                    value={addForm.title}
                    onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))} />

                  <div className="sp-form-row">
                    <select className="sp-input sp-select"
                      value={addForm.subject}
                      onChange={e => setAddForm(p => ({ ...p, subject: e.target.value }))}>
                      {PRESET_SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {addForm.subject === 'Other' && (
                      <input className="sp-input" placeholder="Subject name"
                        value={addForm.customSubject}
                        onChange={e => setAddForm(p => ({ ...p, customSubject: e.target.value }))} />
                    )}
                  </div>

                  <div className="sp-form-row">
                    <select className="sp-input sp-select"
                      value={addForm.priority}
                      onChange={e => setAddForm(p => ({ ...p, priority: e.target.value }))}>
                      <option value="low">Low priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="high">High priority</option>
                    </select>
                    <select className="sp-input sp-select"
                      value={addForm.type}
                      onChange={e => setAddForm(p => ({ ...p, type: e.target.value }))}>
                      {Object.entries(TASK_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <input className="sp-input sp-input--sm" type="number"
                      min="1" max="12" title="Estimated Pomodoros (🍅)"
                      value={addForm.estimatedPomodoros}
                      onChange={e => setAddForm(p => ({ ...p, estimatedPomodoros: e.target.value }))} />
                    <input className="sp-input" type="date"
                      min={todayISO}
                      max={maxDateISO}
                      value={addForm.dueDate}
                      onChange={e => setAddForm(p => ({ ...p, dueDate: e.target.value }))} />
                  </div>

                  <div className="sp-form-actions">
                    <button type="submit" className="sp-submit-btn" disabled={!addForm.title.trim() || savingTask}>
                      {savingTask ? <Loader2 size={12} className="sp-spin" /> : <Plus size={12} />}
                      Add Task
                    </button>
                    <button type="button" className="sp-cancel-btn" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* List */}
              <div className="sp-task-list">
                {filteredTasks.length === 0 && (
                  <div className="sp-tasks-empty">
                    <Circle size={26} style={{ opacity: 0.18 }} />
                    <p>No tasks {taskFilter === 'completed' ? 'completed yet' : '— add one above!'}</p>
                  </div>
                )}
                {filteredTasks.map(task => {
                  const pri    = PRIORITY[task.priority] || PRIORITY.medium;
                  const isDone = task.status === 'completed';
                  const isAct  = activeTaskId === task._id;
                  return (
                    <div key={task._id}
                      className={
                        'sp-task-row' +
                        (isDone ? ' sp-task-row--done' : '') +
                        (isAct  ? ' sp-task-row--active' : '')
                      }>
                      <button className="sp-task-check"
                        onClick={() => handleToggleTask(task._id, task.status)}>
                        {isDone
                          ? <CheckCircle2 size={17} style={{ color: '#10b981' }} />
                          : <Circle size={17} style={{ color: pri.color }} />}
                      </button>

                      <div className="sp-task-body">
                        <span className="sp-task-title">{task.title}</span>
                        <div className="sp-task-meta">
                          <span className="sp-task-subject">{task.subject}</span>
                          <span className="sp-task-pomo">
                            🍅 {task.actualPomodoros}/{task.estimatedPomodoros}
                          </span>
                          {task.dueDate && (
                            <span className="sp-task-due">
                              <Clock size={9} />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {task.fromAI && (
                            <span className="sp-task-ai-badge">
                              <Sparkles size={9} /> AI
                            </span>
                          )}
                          {task.type && task.type !== 'learning' && (
                            <span className="sp-task-type-badge"
                              style={{ background: (TASK_TYPES[task.type]?.color || '#64748b') + '22',
                                       color: TASK_TYPES[task.type]?.color || '#64748b' }}>
                              {TASK_TYPES[task.type]?.label || task.type}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="sp-task-actions">
                        {!isDone && (
                          <button
                            className="sp-task-link-btn"
                            title={isAct ? 'Active' : 'Link to timer'}
                            onClick={() => setActiveTaskId(isAct ? '' : task._id)}
                            style={isAct ? { color: '#8b5cf6' } : {}}>
                            {isAct ? <Brain size={12} /> : <Play size={12} />}
                          </button>
                        )}
                        <button className="sp-task-del-btn"
                          onClick={() => handleDeleteTask(task._id)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Calendar + Analytics + AI Notes ─────────────────── */}
          <div className="sp-right">

            {/* ── Calendar ──────────────────────────────────────────────────── */}
            <div className="sp-cal-wrap">

              {/* ── Calendar toolbar ── */}
              <div className="sp-cal-toolbar">
                <div className="sp-cal-nav">
                  <button className="sp-cal-nav-btn" onClick={() => setWeekStart(d => addDays(d, -7))}>
                    <ChevronLeft size={15} />
                  </button>
                  <span className="sp-cal-range">
                    {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' – '}
                    {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button className="sp-cal-nav-btn" onClick={() => setWeekStart(d => addDays(d, 7))}>
                    <ChevronRight size={15} />
                  </button>
                  <button className="sp-cal-today-btn" onClick={() => setWeekStart(getMondayOf(new Date()))}>
                    Today
                  </button>
                </div>
                <div className="sp-cal-actions">
                  <button className="sp-cal-add-btn" onClick={() => setShowAddEventModal(true)}>
                    <Plus size={13} /> Add Event
                  </button>
                </div>
              </div>

              {/* ── Weekly grid ── */}
              <div className="sp-cal-grid-outer">
                {calLoading && <div className="sp-cal-loading"><Loader2 size={20} className="sp-spin" /></div>}

                {/* Day headers */}
                <div className="sp-cal-head-row">
                  <div className="sp-cal-time-gutter" />
                  {weekDays.map((day, i) => {
                    const isToday = toISO(day) === todayISO;
                    return (
                      <div key={i} className={'sp-cal-day-head' + (isToday ? ' sp-cal-day-head--today' : '')}>
                        <span className="sp-cal-dow">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className={'sp-cal-dom' + (isToday ? ' sp-cal-dom--today' : '')}>
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Time grid */}
                <div className="sp-cal-body" ref={calBodyRef}>
                  {/* Time gutter */}
                  <div className="sp-cal-time-col">
                    {WEEK_HOURS.map(h => (
                      <div key={h} className="sp-cal-hour-label">
                        {h === 12 ? '12 PM' : h < 12 ? h + ' AM' : (h - 12) + ' PM'}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day, di) => {
                    const dateStr  = toISO(day);
                    const dayEvs   = eventsByDate[dateStr] || [];
                    const isToday  = dateStr === todayISO;
                    return (
                      <div key={di}
                        data-date={dateStr}
                        className={'sp-cal-col' + (isToday ? ' sp-cal-col--today' : '')}
                        onClick={(e) => {
                          if (e.target.closest('.sp-cal-event')) return;
                          setNewEventForm(p => ({ ...p, date: dateStr }));
                          setShowAddEventModal(true);
                        }}>
                        {/* Hour lines */}
                        {WEEK_HOURS.map(h => (
                          <div key={h} className="sp-cal-hour-row" />
                        ))}

                        {/* Events */}
                        {dayEvs.map(ev => {
                          const startM   = timeToMins(ev.startTime);
                          const top      = (startM / 60 - 6) * HOUR_PX;
                          const height   = durationToHeight(ev.durationMinutes || 60);
                          const isDragging = dragPreview?._id === ev._id;
                          return (
                            <div key={ev._id}
                              className={'sp-cal-event' + (ev.completed ? ' sp-cal-event--done' : '')}
                              style={{ top: top + 'px', height: height + 'px', borderLeftColor: ev.completed ? '#10b981' : (ev.color || '#8b5cf6'), background: ev.completed ? '#10b98122' : ((ev.color || '#8b5cf6') + '22'), cursor: 'grab', opacity: isDragging ? 0.3 : 1, userSelect: 'none' }}
                              onMouseDown={(e) => {
                                if (e.button !== 0 || e.target.closest('.sp-cal-event-btns')) return;
                                e.preventDefault(); e.stopPropagation();
                                const col     = e.currentTarget.closest('[data-date]');
                                const colRect = col.getBoundingClientRect();
                                const evRect  = e.currentTarget.getBoundingClientRect();
                                dragRef.current = {
                                  ev,
                                  offsetY:     e.clientY - evRect.top,
                                  newDateStr:  ev.date,
                                  colTopAbs:   colRect.top,
                                  snappedMins: toMins(ev.startTime),
                                  startX:      e.clientX,
                                  startY:      e.clientY,
                                  hasMoved:    false,
                                };
                              }}>
                              <div className="sp-cal-event-title">{ev.title}</div>
                              <div className="sp-cal-event-time">{ev.startTime}–{ev.endTime}</div>
                              <div className="sp-cal-event-btns">
                                <button className="sp-cal-ev-check" title={ev.completed ? 'Mark undone' : 'Mark done'}
                                  onClick={(e) => { e.stopPropagation(); handleToggleEventDone(ev); }}>
                                  {ev.completed ? <CheckCircle2 size={11} style={{ color: '#10b981' }} /> : <Circle size={11} />}
                                </button>
                                <button className="sp-cal-ev-del" title="Delete"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev._id); }}>
                                  <X size={10} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {/* Drag ghost */}
                        {dragPreview?.dateStr === dateStr && (
                          <div className="sp-cal-event"
                            style={{ position: 'absolute', top: dragPreview.top + 'px', height: dragPreview.height + 'px', borderLeftColor: dragPreview.color || '#8b5cf6', background: (dragPreview.color || '#8b5cf6') + '55', opacity: 0.9, pointerEvents: 'none', zIndex: 30, outline: '2px dashed ' + (dragPreview.color || '#8b5cf6') }}>
                            <div className="sp-cal-event-title">{dragPreview.title}</div>
                            <div className="sp-cal-event-time">{dragPreview.startTime}–{dragPreview.endTime}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Heatmap card */}
            <div className="sp-analytics-card">
              <div className="sp-card-header">
                <BarChart2 size={14} style={{ color: '#8b5cf6' }} />
                <div>
                  <div className="sp-card-title">Activity Heatmap</div>
                  <div className="sp-card-sub">Last 365 days</div>
                </div>
              </div>

              <div className="sp-heatmap-wrap">
                {heatmapWeeks.length === 0
                  ? <div className="sp-heatmap-empty">Start a session to see your activity</div>
                  : (
                    <div className="sp-heatmap-grid">
                      {heatmapWeeks.map((week, wi) => (
                        <div key={wi} className="sp-heatmap-col">
                          {week.map((day, di) => (
                            <div key={di}
                              className="sp-heatmap-cell"
                              style={{ background: day ? heatColor(day.minutes) : 'transparent' }}
                              title={day ? day.date + ': ' + day.minutes + ' min' : ''} />
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                }
                <div className="sp-heatmap-legend">
                  <span className="sp-heatmap-lbl-text">Less</span>
                  {[0, 15, 40, 80, 120].map(v => (
                    <div key={v} className="sp-heatmap-cell sp-heatmap-sample"
                      style={{ background: heatColor(v) }} />
                  ))}
                  <span className="sp-heatmap-lbl-text">More</span>
                </div>
              </div>
            </div>
          </div>
          </div>

        )}

        {/* ══ TAB: Reminders ══════════════════════════════════════════════ */}
        {activeTab === 'reminders' && (
          <div className="sp-reminders-wrap">
            {remindersLoading && (
              <div className="sp-rem-loading"><Loader2 size={20} className="sp-spin" /> Loading reminders…</div>
            )}

            {pendingReminders.length === 0 && !remindersLoading && (
              <div className="sp-rem-empty">
                <Bell size={32} style={{ opacity: 0.18 }} />
                <p>No pending revision reminders.</p>
                <span>Complete a <strong>Learning</strong> task to get spaced-repetition reminders.</span>
              </div>
            )}

            {overdueReminders.length > 0 && (
              <div className="sp-rem-section">
                <div className="sp-rem-section-title sp-rem-section-title--overdue">
                  ⚠ Overdue ({overdueReminders.length})
                </div>
                {overdueReminders.map(r => (
                  <div key={r._id} className="sp-rem-row sp-rem-row--overdue">
                    <div className="sp-rem-body">
                      <span className="sp-rem-title">{r.title}</span>
                      <span className="sp-rem-subject">{r.subject}</span>
                      <span className="sp-rem-due">Due {new Date(r.dueAt).toLocaleDateString()} · Revision #{r.iteration}</span>
                    </div>
                    <div className="sp-rem-actions">
                      <button className="sp-rem-done-btn" onClick={() => handleMarkReminder(r._id, 'done')}>
                        <CheckCircle2 size={12} /> Revised
                      </button>
                      <button className="sp-rem-dismiss-btn" onClick={() => handleMarkReminder(r._id, 'dismissed')}>
                        <X size={11} /> Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dueTodayReminders.length > 0 && (
              <div className="sp-rem-section">
                <div className="sp-rem-section-title sp-rem-section-title--today">
                  📅 Due Today ({dueTodayReminders.length})
                </div>
                {dueTodayReminders.map(r => (
                  <div key={r._id} className="sp-rem-row sp-rem-row--today">
                    <div className="sp-rem-body">
                      <span className="sp-rem-title">{r.title}</span>
                      <span className="sp-rem-subject">{r.subject}</span>
                      <span className="sp-rem-due">Today · Revision #{r.iteration}</span>
                    </div>
                    <div className="sp-rem-actions">
                      <button className="sp-rem-done-btn" onClick={() => handleMarkReminder(r._id, 'done')}>
                        <CheckCircle2 size={12} /> Revised
                      </button>
                      <button className="sp-rem-dismiss-btn" onClick={() => handleMarkReminder(r._id, 'dismissed')}>
                        <X size={11} /> Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {upcomingReminders.length > 0 && (
              <div className="sp-rem-section">
                <div className="sp-rem-section-title">
                  🔔 Upcoming ({upcomingReminders.length})
                </div>
                {upcomingReminders.map(r => (
                  <div key={r._id} className="sp-rem-row">
                    <div className="sp-rem-body">
                      <span className="sp-rem-title">{r.title}</span>
                      <span className="sp-rem-subject">{r.subject}</span>
                      <span className="sp-rem-due">
                        Due {new Date(r.dueAt).toLocaleDateString()} · Revision #{r.iteration}
                        {' (+' + r.interval + 'd)'}
                      </span>
                    </div>
                    <div className="sp-rem-actions">
                      <button className="sp-rem-dismiss-btn" onClick={() => handleMarkReminder(r._id, 'dismissed')}>
                        <X size={11} /> Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>{/* /sp-root */}

      {/* ══ ADD EVENT MODAL ════════════════════════════════════════════════ */}
      {showAddEventModal && (
        <div className="sp-modal-overlay" onClick={() => setShowAddEventModal(false)}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-modal-header">
              <span><Calendar size={14} /> Add Calendar Event</span>
              <button onClick={() => setShowAddEventModal(false)}><X size={14} /></button>
            </div>
            <form className="sp-modal-body" onSubmit={handleAddEvent}>
              <input className="sp-input" placeholder="Event title *" autoFocus required
                value={newEventForm.title}
                onChange={e => setNewEventForm(p => ({ ...p, title: e.target.value }))} />
              <div className="sp-form-row">
                <select className="sp-input sp-select" value={newEventForm.subject}
                  onChange={e => setNewEventForm(p => ({ ...p, subject: e.target.value }))}>
                  {PRESET_SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="sp-input sp-select" value={newEventForm.type}
                  onChange={e => setNewEventForm(p => ({ ...p, type: e.target.value }))}>
                  {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="sp-form-row">
                <input className="sp-input" type="date" required value={newEventForm.date}
                  onChange={e => setNewEventForm(p => ({ ...p, date: e.target.value }))} />
                <input className="sp-input" type="time" required value={newEventForm.startTime}
                  onChange={e => setNewEventForm(p => ({ ...p, startTime: e.target.value }))} />
                <input className="sp-input" type="time" required value={newEventForm.endTime}
                  onChange={e => setNewEventForm(p => ({ ...p, endTime: e.target.value }))} />
              </div>
              <div className="sp-form-row sp-color-row">
                <span className="sp-color-label">Color:</span>
                {EVENT_COLORS.map(c => (
                  <button key={c} type="button"
                    className={'sp-color-swatch' + (newEventForm.color === c ? ' sp-color-swatch--sel' : '')}
                    style={{ background: c }}
                    onClick={() => setNewEventForm(p => ({ ...p, color: c }))} />
                ))}
              </div>
              <div className="sp-form-actions">
                <button type="submit" className="sp-submit-btn">
                  <Plus size={12} /> Add Event
                </button>
                <button type="button" className="sp-cancel-btn" onClick={() => setShowAddEventModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (() => {
        const ev = selectedEvent;
        const durMins  = ev.durationMinutes || Math.max(0, toMins(ev.endTime) - toMins(ev.startTime));
        const durH     = Math.floor(durMins / 60);
        const durM     = durMins % 60;
        const durLabel = durH > 0 ? `${durH}h${durM > 0 ? ' ' + durM + 'm' : ''}` : `${durM}m`;
        const dateObj  = new Date(ev.date + 'T12:00:00');
        const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const typeInfo = TASK_TYPES[ev.type] || TASK_TYPES.other;
        const TypeIcon = typeInfo.icon;
        return (
          <div className="sp-ev-detail-backdrop" onClick={() => setSelectedEvent(null)}>
            <div className="sp-ev-detail-modal" onClick={e => e.stopPropagation()}>
              <div className="sp-ev-detail-color-bar" style={{ background: ev.color || '#8b5cf6' }} />
              <button className="sp-ev-detail-close" onClick={() => setSelectedEvent(null)}>
                <X size={15} />
              </button>
              <div className="sp-ev-detail-title">{ev.title}</div>
              <div className="sp-ev-detail-row">
                <Calendar size={13} style={{ color: ev.color || '#8b5cf6' }} />
                <span>{dateLabel}</span>
              </div>
              <div className="sp-ev-detail-row">
                <Clock size={13} style={{ color: ev.color || '#8b5cf6' }} />
                <span>{ev.startTime} – {ev.endTime}</span>
                <span style={{ marginLeft: 4, opacity: 0.55 }}>({durLabel})</span>
              </div>
              <div className="sp-ev-detail-row">
                <TypeIcon size={13} style={{ color: typeInfo.color }} />
                <span className={'sp-ev-detail-badge' + (ev.completed ? ' sp-ev-detail-badge--done' : '')}>
                  {ev.completed ? <CheckCircle2 size={10} /> : null}
                  {ev.completed ? 'Completed' : typeInfo.label}
                </span>
                <span style={{ marginLeft: 4, opacity: 0.5, fontSize: '0.75rem' }}>{ev.subject}</span>
              </div>
              <div className="sp-ev-detail-actions">
                <button className={'sp-ev-detail-btn sp-ev-detail-btn--done'}
                  onClick={() => handleToggleEventDone(ev)}>
                  <CheckCircle2 size={13} />
                  {ev.completed ? 'Mark undone' : 'Mark done'}
                </button>
                <button className="sp-ev-detail-btn sp-ev-detail-btn--del"
                  onClick={() => { handleDeleteEvent(ev._id); setSelectedEvent(null); }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast notification */}
      {toast && (
        <div className={
          'sp-toast' +
          (toast.type === 'error'   ? ' sp-toast--err' : '') +
          (toast.type === 'success' ? ' sp-toast--ok'  : '')
        }>
          {toast.type === 'success' && <CheckCircle2 size={13} style={{ color: '#10b981' }} />}
          {toast.type === 'error'   && <AlertCircle  size={13} style={{ color: '#ef4444' }} />}
          {toast.type === 'info'    && <Sparkles      size={13} style={{ color: '#a78bfa' }} />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)}><X size={11} /></button>
        </div>
      )}

      <Footer />
    </div>
  );
}

