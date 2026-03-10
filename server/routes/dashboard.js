/**
 * server/routes/dashboard.js
 * Nexus Dashboard — aggregation API
 *
 * Endpoints:
 *   GET  /api/dashboard/:userId          — full dashboard snapshot
 *   GET  /api/dashboard/:userId/apps     — user's application tracker list
 *   POST /api/dashboard/:userId/apps     — add application
 *   PUT  /api/dashboard/:userId/apps/:id — update application (status etc.)
 *   DELETE /api/dashboard/:userId/apps/:id — delete application
 */

'use strict';

const express  = require('express');
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');

const router             = express.Router();
const UserApplication    = require('../models/UserApplication');
const StudyTask          = require('../models/StudyTask');
const StudyAnalytics     = require('../models/StudyAnalytics');
const AimPlan            = require('../models/AimPlan');
const Hackathon          = require('../models/Hackathon');
const Internship         = require('../models/Internship');
const Job                = require('../models/Job');

/* ── helpers ──────────────────────────────────────────────── */
function mongoReady() {
  return mongoose.connection.readyState === 1;
}

function daysUntil(date) {
  if (!date) return null;
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / 86400000);
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
function pickColor(str) {
  let h = 0;
  for (const c of (str || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return COLORS[h % COLORS.length];
}

/* ── hackathon fallback (cache file) ─────────────────────── */
const HACK_CACHE = path.join(__dirname, '..', 'data', 'hackathons-cache.json');
function hackathonsFromCache(limit = 3) {
  try {
    const raw  = JSON.parse(fs.readFileSync(HACK_CACHE, 'utf8'));
    const list = raw.hacks || raw.items || raw || [];
    return list
      .filter(h => h.status !== 'ended')
      .slice(0, limit)
      .map(h => ({
        _id:       h._id || h.uid,
        name:      h.title,
        prize:     h.prize || null,
        startDate: h.startDate || null,
        deadline:  h.deadline || null,
        status:    h.status || 'upcoming',
        url:       h.url || '#',
      }));
  } catch { return []; }
}

/* ── internship fallback (cache file) ─────────────────────── */
const INTERN_CACHE = path.join(__dirname, '..', 'data', 'internships-cache.json');
function internshipsFromCache(limit = 6) {
  try {
    const raw  = JSON.parse(fs.readFileSync(INTERN_CACHE, 'utf8'));
    const list = raw.items || [];
    return list
      .filter(i => i.status !== 'closed')
      .slice(0, limit)
      .map(i => ({
        _id:      i._id || i.uid,
        title:    i.title,
        company:  i.organizer,
        deadline: i.deadline || null,
        stipend:  i.stipend || null,
        url:      i.url || '#',
      }));
  } catch { return []; }
}

/* ═══════════════════════════════════════════════════════════
   GET /api/dashboard/:userId
   Returns full dashboard snapshot
════════════════════════════════════════════════════════════ */
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // ── 1. Study stats ──────────────────────────────────────
    let tasksDone = 0, tasksTotal = 0;
    let upcomingTasks = [], overdueTasks = [];
    let todayFocusMinutes = 0, streak = 0;

    if (mongoReady()) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const [tasks, todayAnalytics] = await Promise.all([
        StudyTask.find({ userId, status: { $ne: 'completed' } }).sort({ dueDate: 1, createdAt: -1 }).limit(30).lean(),
        StudyAnalytics.findOne({ userId, date: new Date().toISOString().split('T')[0] }).lean(),
      ]);
      const allTasks = await StudyTask.find({ userId }).lean();
      tasksTotal        = allTasks.length;
      tasksDone         = allTasks.filter(t => t.status === 'completed').length;
      todayFocusMinutes = todayAnalytics?.totalFocusMinutes || 0;
      streak            = todayAnalytics?.currentStreak     || 0;

      const mapTask = t => ({
        _id:     String(t._id),
        label:   t.title,
        subject: t.subject || null,
        done:    t.status === 'completed',
        dueDate: t.dueDate || null,
        type:    t.type || 'learning',
        priority: t.priority || 'medium',
      });
      overdueTasks  = tasks.filter(t => t.dueDate && new Date(t.dueDate) < todayStart).slice(0, 3).map(mapTask);
      upcomingTasks = tasks.filter(t => !t.dueDate || new Date(t.dueDate) >= todayStart).slice(0, 5).map(mapTask);
    }

    // ── 2. AIM readiness ───────────────────────────────────
    let nexusScore = 0, hireReadiness = 0, aimEta = null, aimRole = '';
    let aimDoc = null;
    if (mongoReady()) {
      aimDoc = await AimPlan.findOne({ userId }).lean();
      if (aimDoc?.plan) {
        const raw     = aimDoc.plan.hireReadiness;
        nexusScore    = aimDoc.plan.nexusScore?.total ?? aimDoc.plan.nexusScore ?? 0;
        hireReadiness = (typeof raw === 'object' && raw !== null) ? (raw.total ?? 0) : (raw || 0);
        aimEta        = aimDoc.plan.eta?.targetDate || aimDoc.plan.eta || null;
        aimRole       = aimDoc.plan.target?.role || aimDoc.plan.role || '';
      }
    }
    // Compute readiness from study tasks if no AIM plan
    if (!hireReadiness && tasksTotal > 0) {
      hireReadiness = Math.round((tasksDone / tasksTotal) * 70 + 30);
    }

    // ── 3. Upcoming hackathons ─────────────────────────────
    let hackathons = [];
    if (mongoReady()) {
      const now  = new Date();
      const docs = await Hackathon
        .find({ status: { $ne: 'ended' } })
        .sort({ deadline: 1, startDate: 1 })
        .limit(3)
        .lean();
      hackathons = docs.map(h => {
        const displayDate = h.deadline || h.startDate;
        return {
          _id:       String(h._id),
          name:      h.title,
          prize:     h.prize || null,
          featured:  !!h.featured,
          date:      displayDate ? new Date(displayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
          daysUntil: daysUntil(h.deadline || h.startDate),
          status:    h.status,
          url:       h.url || '#',
          color:     pickColor(h.title),
        };
      });
    }
    // If DB records have no usable date info, prefer the richer cache data
    const dbHasDateInfo = hackathons.some(h => h.daysUntil !== null);
    if (!hackathons.length || !dbHasDateInfo) {
      hackathons = hackathonsFromCache(3).map(h => {
        const displayDate = h.deadline || h.startDate;
        return {
          ...h,
          date:      displayDate ? new Date(displayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
          daysUntil: daysUntil(h.deadline || h.startDate),
          color:     pickColor(h.name || h.title),
        };
      });
    }

    // ── 4. Recent open internships ─────────────────────────
    let internships = [];
    if (mongoReady()) {
      const docs = await Internship
        .find({ status: 'open' })
        .sort({ scrapedAt: -1 })
        .limit(6)
        .lean();
      internships = docs.map(i => ({
        _id:     i._id,
        company: i.organizer,
        role:    i.title,
        deadline: i.deadline ? new Date(i.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
        stipend: i.stipend || null,
        url:     i.url || '#',
        color:   pickColor(i.organizer),
      }));
    }
    if (!internships.length) {
      internships = internshipsFromCache(6).map(i => ({
        ...i,
        deadline: i.deadline ? new Date(i.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
        color: pickColor(i.company),
      }));
    }

    // ── 5. Jobs matching AIM role ──────────────────────────
    let jobs = [];
    if (mongoReady()) {
      if (aimRole) {
        const words = aimRole.trim().split(/\s+/).slice(0, 4).join(' ');
        try {
          const jDocs = await Job.find({ $text: { $search: words } }, { score: { $meta: 'textScore' } })
            .sort({ score: { $meta: 'textScore' }, postedAt: -1 }).limit(5).lean();
          jobs = jDocs.map(j => ({ _id: String(j._id), title: j.title, company: j.company, type: j.type, level: j.level, location: j.location, salary: j.salary, url: j.url, source: j.source }));
        } catch { /* text index may not exist */ }
      }
      if (!jobs.length) {
        const jDocs = await Job.find({}).sort({ postedAt: -1 }).limit(5).lean();
        jobs = jDocs.map(j => ({ _id: String(j._id), title: j.title, company: j.company, type: j.type, level: j.level, location: j.location, salary: j.salary, url: j.url, source: j.source }));
      }
    }

    res.json({
      study: {
        tasksDone,
        tasksTotal,
        todayFocusMinutes,
        streak,
        upcomingTasks,
        overdueTasks,
      },
      aim: {
        nexusScore,
        hireReadiness,
        eta:  aimEta,
        role: aimRole,
      },
      hackathons,
      internships,
      jobs,
    });
  } catch (e) {
    console.error('[dashboard] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   APPLICATION TRACKER CRUD
════════════════════════════════════════════════════════════ */

// GET /api/dashboard/:userId/apps
router.get('/:userId/apps', async (req, res) => {
  try {
    const apps = await UserApplication.find({ userId: req.params.userId }).sort({ updatedAt: -1 }).lean();
    res.json({ applications: apps });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dashboard/:userId/apps
router.post('/:userId/apps', async (req, res) => {
  const { company, role, status, deadline, url, notes, color } = req.body;
  if (!company) return res.status(400).json({ error: 'company required' });
  try {
    const app = await UserApplication.create({
      userId:   req.params.userId,
      company:  company.trim(),
      role:     role    || '',
      status:   status  || 'wishlist',
      deadline: deadline ? new Date(deadline) : null,
      url:      url   || '',
      notes:    notes || '',
      color:    color || pickColor(company),
    });
    res.json({ application: app });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/dashboard/:userId/apps/:id
router.put('/:userId/apps/:id', async (req, res) => {
  const { company, role, status, deadline, url, notes, color } = req.body;
  try {
    const updates = { updatedAt: new Date() };
    if (company  !== undefined) updates.company  = company.trim();
    if (role     !== undefined) updates.role     = role;
    if (status   !== undefined) updates.status   = status;
    if (deadline !== undefined) updates.deadline = deadline ? new Date(deadline) : null;
    if (url      !== undefined) updates.url      = url;
    if (notes    !== undefined) updates.notes    = notes;
    if (color    !== undefined) updates.color    = color;

    const app = await UserApplication.findOneAndUpdate(
      { _id: req.params.id, userId: req.params.userId },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json({ application: app });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/dashboard/:userId/apps/:id
router.delete('/:userId/apps/:id', async (req, res) => {
  try {
    await UserApplication.deleteOne({ _id: req.params.id, userId: req.params.userId });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
