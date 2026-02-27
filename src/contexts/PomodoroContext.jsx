import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const PomodoroContext = createContext();

export const PomodoroProvider = ({ children }) => {
  const [mode, setMode] = useState('work'); // 'work' or 'break'
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [showBreakPopup, setShowBreakPopup] = useState(false);
  const [showResumePopup, setShowResumePopup] = useState(false);
  const [totalStudySeconds, setTotalStudySeconds] = useState(0);
  const intervalRef = useRef(null);

  // Start or stop timer
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => s - 1);
        if (mode === 'work') {
          setTotalStudySeconds((t) => t + 1);
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode]);

  // Handle timer end
  useEffect(() => {
    if (secondsLeft === 0) {
      setIsRunning(false);
      if (mode === 'work') {
        setShowBreakPopup(true);
      } else {
        setShowResumePopup(true);
      }
    }
  }, [secondsLeft, mode]);

  // Start work or break
  const startWork = () => {
    setMode('work');
    setSecondsLeft(25 * 60);
    setIsRunning(true);
    setShowResumePopup(false);
  };
  const startBreak = () => {
    setMode('break');
    setSecondsLeft(5 * 60);
    setIsRunning(true);
    setShowBreakPopup(false);
  };
  const skipBreak = () => {
    setShowBreakPopup(false);
    startWork();
  };
  const pause = () => setIsRunning(false);
  const resume = () => setIsRunning(true);
  const reset = () => {
    setMode('work');
    setSecondsLeft(25 * 60);
    setIsRunning(false);
    setShowBreakPopup(false);
    setShowResumePopup(false);
  };

  const value = {
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
  };
  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
};

export const usePomodoro = () => useContext(PomodoroContext);
