/**
 * server/routes/study.js
 * Nexus Study Planner — backend API
 *
 * MongoDB-first: uses Mongoose models when connected.
 * Falls back to flat-file JSON (data/study-data.json) when MongoDB is not available.
 *
 * Endpoints:
 *   GET    /api/study/tasks
 *   POST   /api/study/task
 *   PUT    /api/study/task/:id
 *   DELETE /api/study/task/:id
 *   POST   /api/study/session
 *   GET    /api/study/analytics/heatmap
 *   GET    /api/study/analytics/today
 *   POST   /api/study/ai/process
 *   POST   /api/study/ai/confirm
 *   GET    /api/study/materials
 */

const express   = require('express');
const fetch     = require('node-fetch');
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');
const mongoose  = require('mongoose');

const router = express.Router();

// Mongoose models
const StudyTask         = require('../models/StudyTask');
const StudySession      = require('../models/StudySession');
const StudyAnalytics    = require('../models/StudyAnalytics');
const StudyMaterial     = require('../models/StudyMaterial');
const StudyEvent        = require('../models/StudyEvent');
const RevisionReminder  = require('../models/RevisionReminder');

/* ═══════════════════════════════════════════════════
   CONNECTION CHECK
   ═══════════════════════════════════════════════════ */
function useMongo() {
  return mongoose.connection.readyState === 1;
}

/* ═══════════════════════════════════════════════════
   FLAT-FILE FALLBACK STORE
   ═══════════════════════════════════════════════════ */
const DATA_FILE  = path.join(__dirname, '..', 'data', 'study-data.json');
const DEFAULT_DB = { tasks: [], sessions: [], analytics: {}, materials: [] };

function readDB() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (_) { return JSON.parse(JSON.stringify(DEFAULT_DB)); }
}
function writeDB(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.warn('[study] writeDB failed:', e.message); }
}
function uid() { return crypto.randomBytes(10).toString('hex'); }

/* ═══════════════════════════════════════════════════
   DATE HELPERS
   ═══════════════════════════════════════════════════ */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/* ═══════════════════════════════════════════════════
   GEMINI HELPER
   ═══════════════════════════════════════════════════ */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[study] Gemini HTTP', res.status, errText.slice(0, 200));
      return null;
    }
    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return raw; // return raw text; caller does its own JSON parsing
  } catch (e) {
    console.error('[study] Gemini error:', e.message);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK SCHEDULE BUILDER  (fallback when Gemini key is absent)
   ═══════════════════════════════════════════════════════════════════════════ */
const SUBJECT_COLORS = [
  '#8b5cf6','#3b82f6','#10b981','#f59e0b',
  '#ef4444','#ec4899','#06b6d4','#84cc16',
];
const SESSION_TYPES = ['learning','learning','practice','revision'];

function buildMockSchedule({ userId, subjects, hoursPerDay, wakeTime, preference, today, deadlineStr }) {
  const events        = [];
  const colorMap      = {};
  subjects.forEach((s, i) => { colorMap[s] = SUBJECT_COLORS[i % SUBJECT_COLORS.length]; });

  // preference → start hour
  const prefStart = preference === 'afternoon' ? 13
                  : preference === 'evening'   ? 17
                  : 8; // morning / spread

  // Parse wakeTime to ensure we respect it
  const [wakeH] = (wakeTime || '07:00').split(':').map(Number);
  const slotStart = Math.max(prefStart, wakeH);

  // Date range
  const start    = new Date(today);
  const end      = new Date(deadlineStr);
  const dayCount = Math.max(1, Math.round((end - start) / 86400000) + 1);

  let sessionCounter = 0;
  for (let d = 0; d < dayCount; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const dayISO = date.toISOString().split('T')[0];

    let hourCursor = slotStart;
    const hoursToday = Math.min(hoursPerDay, 8);  // cap at 8h/day

    let minsScheduled = 0;
    while (minsScheduled < hoursToday * 60) {
      const subject    = subjects[sessionCounter % subjects.length];
      const type       = SESSION_TYPES[Math.floor(sessionCounter / subjects.length) % SESSION_TYPES.length];
      const duration   = type === 'revision' ? 45 : 60;  // 45 min revision, 60 min learning/practice

      const startH     = Math.floor(hourCursor);
      const startM     = Math.round((hourCursor - startH) * 60);
      const endMins    = startH * 60 + startM + duration;
      const endH       = Math.floor(endMins / 60);
      const endMm      = endMins % 60;

      if (endH >= 22) break;  // don't schedule past 10 PM

      events.push({
        userId,
        title:           `${subject} — ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        subject,
        date:            dayISO,
        startTime:       String(startH).padStart(2,'0') + ':' + String(startM).padStart(2,'0'),
        endTime:         String(endH).padStart(2,'0') + ':' + String(endMm).padStart(2,'0'),
        durationMinutes: duration,
        type,
        color:           colorMap[subject],
        aiGenerated:     true,
        completed:       false,
      });

      hourCursor  += (duration + 15) / 60;  // session + 15 min break
      minsScheduled += duration;
      sessionCounter++;
    }
  }

  return events;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TASKS
   ═══════════════════════════════════════════════════════════════════════════ */

// GET /api/study/tasks?userId=x
router.get('/tasks', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    if (useMongo()) {
      const tasks = await StudyTask.find({ userId }).sort({ createdAt: -1 });
      return res.json({ tasks });
    }

    // Flat-file fallback
    const db    = readDB();
    const tasks = db.tasks
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ tasks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/study/task
router.post('/task', async (req, res) => {
  const { userId, title, subject, dueDate, priority, estimatedPomodoros } = req.body;
  if (!userId || !title) return res.status(400).json({ error: 'userId + title required' });

  try {
    if (useMongo()) {
      const task = await StudyTask.create({
        userId,
        title:              title.trim(),
        subject:            subject            || 'General',
        dueDate:            dueDate            ? new Date(dueDate) : null,
        priority:           priority           || 'medium',
        estimatedPomodoros: Number(estimatedPomodoros) || 1,
      });
      return res.json({ task });
    }

    // Flat-file fallback
    const task = {
      _id:               uid(),
      userId,
      title:             title.trim(),
      subject:           subject            || 'General',
      dueDate:           dueDate            || null,
      status:            'pending',
      priority:          priority           || 'medium',
      estimatedPomodoros: Number(estimatedPomodoros) || 1,
      actualPomodoros:   0,
      fromAI:            false,
      materialId:        null,
      createdAt:         new Date().toISOString(),
    };
    const db = readDB();
    db.tasks.push(task);
    writeDB(db);
    res.json({ task });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/study/task/:id
router.put('/task/:id', async (req, res) => {
  const { userId, ...updates } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    if (useMongo()) {
      const task = await StudyTask.findOneAndUpdate(
        { _id: req.params.id, userId },
        { $set: updates },
        { new: true }
      );
      if (!task) return res.status(404).json({ error: 'Task not found' });

      if (updates.status === 'completed') {
        await StudyAnalytics.findOneAndUpdate(
          { userId, date: todayStr() },
          { $inc: { tasksCompleted: 1 } },
          { upsert: true }
        );

        // Spaced-repetition reminders — only for learning tasks
        const taskType = task.type || 'learning';
        if (taskType === 'learning') {
          const now = new Date();
          const intervals = [1, 3, 7, 14];
          await RevisionReminder.insertMany(
            intervals.map((days, i) => ({
              userId,
              taskId:              task._id,
              title:               task.title,
              subject:             task.subject || 'General',
              originalCompletedAt: now,
              dueAt:               new Date(now.getTime() + days * 86400000),
              interval:            days,
              status:              'pending',
              iteration:           i + 1,
            }))
          );
        }
      }
      return res.json({ task });
    }

    // Flat-file fallback
    const db  = readDB();
    const idx = db.tasks.findIndex(t => t._id === req.params.id && t.userId === userId);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    db.tasks[idx] = { ...db.tasks[idx], ...updates };
    if (updates.status === 'completed') {
      const key = `${userId}|${todayStr()}`;
      db.analytics[key] = db.analytics[key] || { totalFocusMinutes: 0, tasksCompleted: 0, currentStreak: 0 };
      db.analytics[key].tasksCompleted += 1;
    }
    writeDB(db);
    res.json({ task: db.tasks[idx] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/study/task/:id
router.delete('/task/:id', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    if (useMongo()) {
      const result = await StudyTask.deleteOne({ _id: req.params.id, userId });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Task not found' });
      return res.json({ ok: true });
    }

    // Flat-file fallback
    const db  = readDB();
    const len = db.tasks.length;
    db.tasks  = db.tasks.filter(t => !(t._id === req.params.id && t.userId === userId));
    if (db.tasks.length === len) return res.status(404).json({ error: 'Task not found' });
    writeDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   SESSIONS
   ═══════════════════════════════════════════════════════════════════════════ */

// POST /api/study/session
router.post('/session', async (req, res) => {
  const { userId, taskId, durationMinutes, sessionType, wasCompleted, startTime, endTime } = req.body;
  if (!userId || durationMinutes == null) return res.status(400).json({ error: 'userId + durationMinutes required' });

  const type      = sessionType || 'focus';
  const completed = wasCompleted !== false;
  const mins      = Number(durationMinutes);

  try {
    if (useMongo()) {
      // 1. Persist session
      const session = await StudySession.create({
        userId,
        taskId:          taskId || null,
        startTime:       new Date(startTime || Date.now() - mins * 60000),
        endTime:         new Date(endTime   || Date.now()),
        durationMinutes: mins,
        sessionType:     type,
        wasCompleted:    completed,
      });

      // 2. Increment task's actualPomodoros
      if (type === 'focus' && taskId && completed) {
        await StudyTask.findOneAndUpdate(
          { _id: taskId, userId },
          { $inc: { actualPomodoros: 1 } }
        );
      }

      // 3. Update analytics + streak
      if (type === 'focus' && mins >= 1) {
        const today    = todayStr();
        const yday     = yesterdayStr();
        const ydayDoc  = await StudyAnalytics.findOne({ userId, date: yday });
        const todayDoc = await StudyAnalytics.findOne({ userId, date: today });

        let newStreak = todayDoc?.currentStreak ?? 0;
        if (!todayDoc || todayDoc.totalFocusMinutes === 0) {
          newStreak = (ydayDoc && ydayDoc.totalFocusMinutes > 0)
            ? (ydayDoc.currentStreak || 0) + 1
            : 1;
        }

        await StudyAnalytics.findOneAndUpdate(
          { userId, date: today },
          {
            $inc: { totalFocusMinutes: mins },
            $set: { currentStreak: newStreak },
          },
          { upsert: true }
        );
      }
      return res.json({ ok: true, session });
    }

    // Flat-file fallback
    const db = readDB();
    const session = {
      _id:             uid(),
      userId,
      taskId:          taskId || null,
      startTime:       startTime || new Date(Date.now() - mins * 60000).toISOString(),
      endTime:         endTime   || new Date().toISOString(),
      durationMinutes: mins,
      sessionType:     type,
      wasCompleted:    completed,
      createdAt:       new Date().toISOString(),
    };
    db.sessions.push(session);

    if (type === 'focus' && taskId && completed) {
      const tidx = db.tasks.findIndex(t => t._id === taskId && t.userId === userId);
      if (tidx !== -1) db.tasks[tidx].actualPomodoros = (db.tasks[tidx].actualPomodoros || 0) + 1;
    }

    if (type === 'focus' && mins >= 1) {
      const today   = todayStr();
      const yday    = yesterdayStr();
      const todaKey = `${userId}|${today}`;
      const ydaKey  = `${userId}|${yday}`;
      db.analytics[todaKey] = db.analytics[todaKey] || { totalFocusMinutes: 0, tasksCompleted: 0, currentStreak: 0 };
      const todayRec = db.analytics[todaKey];
      const ydayRec  = db.analytics[ydaKey];
      if (todayRec.totalFocusMinutes === 0) {
        todayRec.currentStreak = (ydayRec && ydayRec.totalFocusMinutes > 0)
          ? (ydayRec.currentStreak || 0) + 1 : 1;
      }
      todayRec.totalFocusMinutes += mins;
      db.analytics[todaKey] = todayRec;
    }

    writeDB(db);
    res.json({ ok: true, session });
  } catch (e) {
    console.error('[study] session error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   ANALYTICS
   ═══════════════════════════════════════════════════════════════════════════ */

// GET /api/study/analytics/heatmap?userId=x
router.get('/analytics/heatmap', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 364);
    const startStr = startDate.toISOString().split('T')[0];

    const heatmap = [];

    if (useMongo()) {
      const records = await StudyAnalytics.find({
        userId,
        date: { $gte: startStr },
      }).lean();
      const byDate = new Map(records.map(r => [r.date, r.totalFocusMinutes]));
      for (let i = 0; i < 365; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split('T')[0];
        heatmap.push({ date: key, minutes: byDate.get(key) || 0 });
      }
      return res.json({ heatmap });
    }

    // Flat-file fallback
    const db = readDB();
    for (let i = 0; i < 365; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const rec     = db.analytics[`${userId}|${dateStr}`];
      heatmap.push({ date: dateStr, minutes: rec?.totalFocusMinutes || 0 });
    }
    res.json({ heatmap });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/study/analytics/today?userId=x
router.get('/analytics/today', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const today = todayStr();

    if (useMongo()) {
      const doc = await StudyAnalytics.findOne({ userId, date: today });
      const sessionCount = await StudySession.countDocuments({
        userId,
        sessionType: 'focus',
        startTime: { $gte: new Date(today) },
      });
      return res.json({
        date:              today,
        totalFocusMinutes: doc?.totalFocusMinutes || 0,
        tasksCompleted:    doc?.tasksCompleted    || 0,
        currentStreak:     doc?.currentStreak     || 0,
        sessionCount,
      });
    }

    // Flat-file fallback
    const db   = readDB();
    const rec  = db.analytics[`${userId}|${today}`] || { totalFocusMinutes: 0, tasksCompleted: 0, currentStreak: 0 };
    const sessionCount = db.sessions.filter(s =>
      s.userId === userId && s.sessionType === 'focus' && s.startTime.startsWith(today)
    ).length;
    res.json({ date: today, ...rec, sessionCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   AI NOTES
   ═══════════════════════════════════════════════════════════════════════════ */

// POST /api/study/ai/process
router.post('/ai/process', async (req, res) => {
  const { userId, fileName, extractedText } = req.body;
  if (!userId || !extractedText) return res.status(400).json({ error: 'userId + extractedText required' });

  const prompt = `You are an expert academic study assistant. A student has uploaded a document.

File: "${fileName}"
Content (first 4000 chars):
---
${extractedText.slice(0, 4000)}
---

Return ONLY valid JSON (no markdown wrapper, no code fences) with exactly this structure:
{
  "summary": "5 bullet points of the most important concepts. Each bullet on its own line starting with •",
  "topics": ["topic1","topic2","topic3","topic4","topic5"],
  "notes": "Structured study notes in markdown. Use ## for main sections, ### for sub-sections, bullet points for details. Aim for 400-600 words covering all key concepts.",
  "diagram": "A valid Mermaid diagram (flowchart TD or mindmap) that visually represents the main concepts and their relationships. Return ONLY the mermaid code, no backticks.",
  "quiz": [
    { "q": "Clear exam-style question", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A", "explanation": "Why A is correct" },
    { "q": "Clear exam-style question", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "B", "explanation": "Why B is correct" },
    { "q": "Clear exam-style question", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "C", "explanation": "Why C is correct" },
    { "q": "Clear exam-style question", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A", "explanation": "Why A is correct" },
    { "q": "Clear exam-style question", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "D", "explanation": "Why D is correct" }
  ],
  "suggestedTasks": [
    { "title": "Specific actionable task", "subject": "Subject", "estimatedPomodoros": 2 },
    { "title": "Specific actionable task", "subject": "Subject", "estimatedPomodoros": 1 },
    { "title": "Practice/test-yourself task", "subject": "Subject", "estimatedPomodoros": 2 }
  ]
}`;

  try {
    let ai = await callGemini(prompt);

    if (!ai) {
      const base = fileName.replace(/\.[^.]+$/i, '');
      ai = {
        summary: `• Document "${base}" uploaded and ready for study\n• Read through carefully and highlight key terms\n• Create a concept map linking the main ideas\n• Write a one-page summary in your own words\n• Test yourself with practice questions after reviewing`,
        topics:  ['Key Concepts', 'Core Principles', 'Applied Methods', 'Important Definitions', 'Review Points'],
        notes:   `## Overview\n- This document covers core concepts from "${base}"\n- Review each section carefully\n\n## Key Principles\n- Identify the main arguments and supporting evidence\n- Note any definitions or formulas\n\n## Summary\n- Create flashcards for important terms\n- Link concepts to real-world examples`,
        diagram: `flowchart TD\n    A["${base}"] --> B["Key Concepts"]\n    A --> C["Core Principles"]\n    A --> D["Applied Methods"]\n    B --> E["Important Definitions"]\n    C --> F["Review Points"]`,
        quiz: [
          { q: `What is the main topic of "${base}"?`, options: ['A) Key Concepts', 'B) Applied Methods', 'C) Core Principles', 'D) All of the above'], answer: 'D', explanation: 'The document covers multiple aspects including concepts, methods and principles.' },
          { q: 'Which study technique is most effective for this material?', options: ['A) Re-reading only', 'B) Active recall & practice', 'C) Highlighting alone', 'D) Memorising without context'], answer: 'B', explanation: 'Active recall through practice questions reinforces memory.' },
          { q: 'How should you structure your notes for this document?', options: ['A) Bullet points only', 'B) Mind maps only', 'C) Headings, bullets, and examples', 'D) Copy the text verbatim'], answer: 'C', explanation: 'Structured notes with examples improve comprehension and retention.' },
          { q: 'When is the best time to revise this material?', options: ['A) Only before exams', 'B) Once is enough', 'C) Using spaced repetition intervals', 'D) Never review if you understood it'], answer: 'C', explanation: 'Spaced repetition (1, 3, 7, 14 days) maximises long-term retention.' },
          { q: 'What should you do after studying this material?', options: ['A) Close the book and forget', 'B) Test yourself with questions', 'C) Immediately move to the next topic', 'D) Skip practice problems'], answer: 'B', explanation: 'Self-testing identifies gaps in understanding before exams.' },
        ],
        suggestedTasks: [
          { title: `Read & annotate: ${base}`,           subject: 'General', estimatedPomodoros: 2 },
          { title: `Create summary notes from: ${base}`, subject: 'General', estimatedPomodoros: 1 },
          { title: `Self-test on topics from: ${base}`,  subject: 'General', estimatedPomodoros: 1 },
        ],
      };
    }

    if (useMongo()) {
      const material = await StudyMaterial.create({
        userId,
        fileName,
        extractedText:   extractedText.slice(0, 5000),
        aiSummary:       ai.summary,
        extractedTopics: ai.topics         || [],
        notes:           ai.notes          || '',
        diagram:         ai.diagram        || '',
        quiz:            ai.quiz           || [],
        suggestedTasks:  ai.suggestedTasks || [],
      });
      return res.json({ material });
    }

    // Flat-file fallback
    const material = {
      _id:             uid(),
      userId,
      fileName,
      extractedText:   extractedText.slice(0, 5000),
      aiSummary:       ai.summary,
      extractedTopics: ai.topics         || [],
      notes:           ai.notes          || '',
      diagram:         ai.diagram        || '',
      quiz:            ai.quiz           || [],
      suggestedTasks:  ai.suggestedTasks || [],
      uploadedAt:      new Date().toISOString(),
    };
    const db = readDB();
    db.materials.push(material);
    writeDB(db);
    res.json({ material });
  } catch (e) {
    console.error('[study] AI process error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/study/ai/confirm
router.post('/ai/confirm', async (req, res) => {
  const { userId, materialId, tasks } = req.body;
  if (!userId || !tasks || !tasks.length) return res.status(400).json({ error: 'userId + tasks required' });

  try {
    if (useMongo()) {
      const created = await StudyTask.insertMany(
        tasks.map(t => ({
          userId,
          title:              t.title,
          subject:            t.subject            || 'General',
          estimatedPomodoros: t.estimatedPomodoros || 1,
          fromAI:             true,
          materialId:         materialId           || null,
        }))
      );
      return res.json({ tasks: created });
    }

    // Flat-file fallback
    const db = readDB();
    const created = tasks.map(t => ({
      _id:               uid(),
      userId,
      title:             t.title,
      subject:           t.subject            || 'General',
      dueDate:           null,
      status:            'pending',
      priority:          'medium',
      estimatedPomodoros: t.estimatedPomodoros || 1,
      actualPomodoros:   0,
      fromAI:            true,
      materialId:        materialId           || null,
      createdAt:         new Date().toISOString(),
    }));
    db.tasks.push(...created);
    writeDB(db);
    res.json({ tasks: created });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/study/materials?userId=x
router.get('/materials', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    if (useMongo()) {
      const materials = await StudyMaterial.find({ userId })
        .sort({ uploadedAt: -1 })
        .limit(10)
        .select('-extractedText');
      return res.json({ materials });
    }

    // Flat-file fallback
    const db = readDB();
    const materials = db.materials
      .filter(m => m.userId === userId)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 10)
      .map(({ extractedText: _et, ...rest }) => rest);
    res.json({ materials });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   CALENDAR EVENTS
   ═══════════════════════════════════════════════════════════════════════════ */

// GET /api/study/events?userId&startDate&endDate
router.get('/events', async (req, res) => {
  const { userId, startDate, endDate } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    if (useMongo()) {
      const filter = { userId };
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = startDate;
        if (endDate)   filter.date.$lte = endDate;
      }
      const events = await StudyEvent.find(filter).sort({ date: 1, startTime: 1 });
      return res.json({ events });
    }

    // Flat-file fallback
    const db = readDB();
    const events = (db.events || []).filter(e => {
      if (e.userId !== userId) return false;
      if (startDate && e.date < startDate) return false;
      if (endDate   && e.date > endDate)   return false;
      return true;
    });
    res.json({ events });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/study/event
router.post('/event', async (req, res) => {
  const { userId, title, subject, date, startTime, endTime, type, color, linkedTaskId } = req.body;
  if (!userId || !title || !date || !startTime || !endTime)
    return res.status(400).json({ error: 'userId, title, date, startTime, endTime required' });

  const start = startTime.split(':').reduce((h, m, i) => i === 0 ? h + Number(m) * 60 : h + Number(m), 0);
  const end   = endTime.split(':').reduce((h, m, i) => i === 0 ? h + Number(m) * 60 : h + Number(m), 0);
  const durationMinutes = Math.max(0, end - start);

  try {
    if (useMongo()) {
      const event = await StudyEvent.create({
        userId, title,
        subject:         subject || 'General',
        date, startTime, endTime, durationMinutes,
        type:            type  || 'learning',
        color:           color || '#8b5cf6',
        linkedTaskId:    linkedTaskId || null,
        aiGenerated:     false,
      });
      return res.json({ event });
    }

    // Flat-file fallback
    const db    = readDB();
    if (!db.events) db.events = [];
    const event = { _id: uid(), userId, title, subject: subject || 'General', date, startTime, endTime, durationMinutes, type: type || 'learning', color: color || '#8b5cf6', linkedTaskId: linkedTaskId || null, aiGenerated: false, completed: false, createdAt: new Date().toISOString() };
    db.events.push(event);
    writeDB(db);
    res.json({ event });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/study/event/:id
router.put('/event/:id', async (req, res) => {
  const { userId, ...updates } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    if (useMongo()) {
      const event = await StudyEvent.findOneAndUpdate(
        { _id: req.params.id, userId },
        { $set: updates },
        { new: true }
      );
      if (!event) return res.status(404).json({ error: 'Event not found' });
      return res.json({ event });
    }

    // Flat-file fallback
    const db  = readDB();
    if (!db.events) db.events = [];
    const idx = db.events.findIndex(e => e._id === req.params.id && e.userId === userId);
    if (idx === -1) return res.status(404).json({ error: 'Event not found' });
    db.events[idx] = { ...db.events[idx], ...updates };
    writeDB(db);
    res.json({ event: db.events[idx] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/study/event/:id
router.delete('/event/:id', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    if (useMongo()) {
      const result = await StudyEvent.deleteOne({ _id: req.params.id, userId });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Event not found' });
      return res.json({ ok: true });
    }

    // Flat-file fallback
    const db  = readDB();
    if (!db.events) db.events = [];
    const len = db.events.length;
    db.events = db.events.filter(e => !(e._id === req.params.id && e.userId === userId));
    if (db.events.length === len) return res.status(404).json({ error: 'Event not found' });
    writeDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   AI SCHEDULE GENERATOR
   ═══════════════════════════════════════════════════════════════════════════ */

// POST /api/study/schedule/ai
// Body: { userId, prompt } OR { userId, subjects[], hoursPerDay, wakeTime, sleepTime, preference, deadline }
router.post('/schedule/ai', async (req, res) => {
  const { userId, prompt, subjects, hoursPerDay, wakeTime, sleepTime, preference, deadline } = req.body;
  if (!userId || (!prompt && !subjects?.length))
    return res.status(400).json({ error: 'userId and either prompt or subjects required' });

  const today      = todayStr();
  const deadlineStr = deadline || (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; })();

  // Build the Gemini prompt
  const aiPrompt = prompt
    ? `You are a study schedule assistant. A student described what they want to study:

"${prompt}"

Today is ${today}. ${deadline ? `Their deadline is ${deadlineStr}.` : `Generate a 14-day schedule starting today.`}

Rules:
1. Parse subjects, daily hours, and preferences from the description
2. Create study events distributed across the days
3. Each session should be 45–90 minutes with breaks
4. Assign a distinct pastel hex color per subject
5. Use types: "learning" for new content, "revision" for review, "practice" for exercises

Respond ONLY with a valid JSON array (no markdown, no explanation):
[
  {
    "title": "React — Hooks Deep Dive",
    "subject": "React",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "type": "learning",
    "color": "#a78bfa"
  }
]`
    : `You are a study schedule assistant. Generate a detailed weekly study schedule.

User preferences:
- Subjects to cover: ${subjects.join(', ')}
- Study hours per day: ${hoursPerDay || 4}
- Wake time: ${wakeTime || '07:00'}
- Sleep time: ${sleepTime || '23:00'}
- Preferred study time: ${preference || 'morning'}
- Schedule from: ${today} to: ${deadlineStr}

Rules:
1. Create study events for each subject, distributed across the week
2. Each session should be 45–90 minutes with breaks in between
3. Respect the wake/sleep times (no events outside those hours)
4. Prefer the stated time preference (morning = 8–12, afternoon = 12–17, evening = 17–21)
5. Assign a hex color per subject (use distinct pastel colors)
6. Task type: use "learning" for new content, "revision" for review sessions, "practice" for exercises

Respond ONLY with a valid JSON array (no markdown, no explanation):
[
  {
    "title": "Calculus — Derivatives",
    "subject": "Mathematics",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "type": "learning",
    "color": "#a78bfa"
  }
]`;

  const raw = await callGemini(aiPrompt);

  // ── No Gemini key or call failed → generate a smart algorithmic schedule ──
  if (!raw) {
    // Parse subjects and hours from the free-text prompt
    let fallbackSubjects = subjects?.length ? subjects : ['General Study'];
    let parsedHours = hoursPerDay || 4;
    if (prompt) {
      // Extract hours per day: "3 hours a day", "2h daily", "4 hours per day"
      const hoursMatch = prompt.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(?:a|per)\s*day/i);
      if (hoursMatch) parsedHours = parseFloat(hoursMatch[1]);

      // Extract subjects: look for words after "learn", "study", "cover", "practice", "revise"
      // and also split on commas/and/& to get individual subjects
      const keywordSentence = prompt
        .replace(/[^\w\s,&+\/]/g, ' ')
        .replace(/\b(i want to|i need to|i have to|help me|please|my|for|in|within|over|the next|days?|weeks?|months?|hours? (a|per) day|daily|deadline|starting|today|from|to)\b/gi, ' ');

      // Pull out multi-word subject-like tokens
      const rawTokens = keywordSentence
        .split(/\s*(?:,|and|&|\+|\/)\s*/i)
        .map(t => t.replace(/\b(learn|study|cover|practice|revise|review|understand|master|prepare for|focus on)\b/gi, '').trim())
        .map(t => t.replace(/\b(in|for|over|within|next|last|a|an|the)\s+\d+\s*(days?|weeks?|months?|hours?)\b/gi, '').trim())
        .map(t => t.replace(/\s*\d+\s*(days?|weeks?|months?|hours?)\b/gi, '').trim())
        .map(t => t.replace(/\b\d+\b/g, '').replace(/\s+/g, ' ').trim())
        .filter(t => t.length > 1 && t.length < 40);

      if (rawTokens.length) fallbackSubjects = rawTokens.slice(0, 6); // max 6 subjects
    }
    const events = buildMockSchedule({ userId, subjects: fallbackSubjects, hoursPerDay: parsedHours, wakeTime: wakeTime || '07:00', preference: preference || 'morning', today, deadlineStr });
    return res.json({ events, mock: true });
  }

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI returned invalid format' });
    const toMinsB = t => { const [h, m] = (t||'00:00').split(':').map(Number); return h*60+m; };
    const overlapsB = (a, b) =>
      a.date === b.date &&
      toMinsB(a.startTime) < toMinsB(b.endTime) &&
      toMinsB(b.startTime) < toMinsB(a.endTime);

    const parsed = JSON.parse(jsonMatch[0]).map(e => ({
      ...e,
      userId,
      aiGenerated: true,
      completed: false,
      durationMinutes: (() => {
        const s = e.startTime.split(':'); const en = e.endTime.split(':');
        return (Number(en[0]) * 60 + Number(en[1])) - (Number(s[0]) * 60 + Number(s[1]));
      })(),
    }));

    // Remove overlapping events within the AI result (keep first)
    const sorted = parsed.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    const events = sorted.reduce((acc, ev) => {
      const last = acc[acc.length - 1];
      if (!last || !overlapsB(last, ev)) acc.push(ev);
      return acc;
    }, []);

    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse AI schedule: ' + err.message });
  }
});

// POST /api/study/schedule/ai/confirm
// Saves the AI-generated events to DB
router.post('/schedule/ai/confirm', async (req, res) => {
  const { userId, events } = req.body;
  if (!userId || !Array.isArray(events) || !events.length)
    return res.status(400).json({ error: 'userId and events[] required' });

  try {
    if (useMongo()) {
      const docs = await StudyEvent.insertMany(
        events.map(e => ({ ...e, userId, aiGenerated: true }))
      );
      return res.json({ saved: docs.length, events: docs });
    }

    // Flat-file fallback
    const db = readDB();
    if (!db.events) db.events = [];
    const newEvents = events.map(e => ({ ...e, _id: uid(), userId, aiGenerated: true, completed: false, createdAt: new Date().toISOString() }));
    db.events.push(...newEvents);
    writeDB(db);
    res.json({ saved: newEvents.length, events: newEvents });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   REVISION REMINDERS
   ═══════════════════════════════════════════════════════════════════════════ */

// GET /api/study/reminders?userId
router.get('/reminders', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    if (useMongo()) {
      const reminders = await RevisionReminder.find({ userId, status: 'pending' })
        .sort({ dueAt: 1 })
        .limit(50);
      return res.json({ reminders });
    }

    // Flat-file fallback
    const db = readDB();
    const reminders = (db.reminders || [])
      .filter(r => r.userId === userId && r.status === 'pending')
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
    res.json({ reminders });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/study/reminder/:id  — mark done or dismiss
router.put('/reminder/:id', async (req, res) => {
  const { userId, status } = req.body;   // status: 'done' | 'dismissed'
  if (!userId || !status) return res.status(400).json({ error: 'userId and status required' });

  try {
    if (useMongo()) {
      const reminder = await RevisionReminder.findOneAndUpdate(
        { _id: req.params.id, userId },
        { $set: { status } },
        { new: true }
      );
      if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
      return res.json({ reminder });
    }

    // Flat-file fallback
    const db  = readDB();
    if (!db.reminders) db.reminders = [];
    const idx = db.reminders.findIndex(r => r._id === req.params.id && r.userId === userId);
    if (idx === -1) return res.status(404).json({ error: 'Reminder not found' });
    db.reminders[idx].status = status;
    writeDB(db);
    res.json({ reminder: db.reminders[idx] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
