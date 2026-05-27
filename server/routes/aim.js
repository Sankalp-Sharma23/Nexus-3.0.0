/**
 * server/routes/aim.js
 * Nexus AIM — AI-powered career roadmap engine
 *
 * Endpoints:
 *   POST /api/aim/generate        ← Runs AI scan, returns master JSON, saves to DB
 *   PUT  /api/aim/task            ← Mark a task done/undone, returns updated plan
 *   GET  /api/aim/plan/:userId    ← Load saved plan
 *   POST /api/aim/plan/:userId    ← Overwrite saved plan
 */

const express        = require('express');
const fetch          = require('node-fetch');
const fs             = require('fs');
const path           = require('path');
const mongoose       = require('mongoose');
const db             = require('../db');
const AimPlan        = require('../models/AimPlan');
const AimExperience  = require('../models/AimExperience');

const router = express.Router();

/* ════════════════════════════════════════════════════════════
   CONNECTION CHECK
   ═══════════════════════════════════════════════════════════ */
function useMongo() {
  return mongoose.connection.readyState === 1;
}

/* ════════════════════════════════════════════════════════════
   FLAT-FILE FALLBACK  (aim-plans.json)
   ═══════════════════════════════════════════════════════════ */
const AIM_PLANS_FILE = path.join(__dirname, '..', 'data', 'aim-plans.json');
function readDB() {
  try { return JSON.parse(fs.readFileSync(AIM_PLANS_FILE, 'utf8')); }
  catch (_) { return {}; }
}
function writeDB(data) {
  try { fs.writeFileSync(AIM_PLANS_FILE, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.warn('[aim] writeDB failed:', e.message); }
}

/* ════════════════════════════════════════════════════════════
   LC BENCHMARK TABLE  — minimum problems to show conceptual understanding per company tier / role type
   ═══════════════════════════════════════════════════════════ */
const LC_BENCHMARKS_KB = {
  // FAANG / top-tier
  google:    { easy: 60,  medium: 150, hard: 40,  note: 'Google expects LeetCode Hard fluency — aim for 150+ Mediums and 40+ Hards.' },
  meta:      { easy: 50,  medium: 120, hard: 30,  note: 'Meta interviews heavily weight Medium/Hard graph, DP and tree problems.' },
  amazon:    { easy: 50,  medium: 100, hard: 20,  note: 'Amazon SDE rounds are Medium-focused; 100 Mediums is a solid baseline.' },
  microsoft: { easy: 50,  medium: 100, hard: 20,  note: 'Microsoft expects solid Medium fluency plus OOP design.' },
  apple:     { easy: 50,  medium: 100, hard: 25,  note: 'Apple looks for clean algorithmic thinking — quality > quantity.' },
  netflix:   { easy: 40,  medium: 100, hard: 20,  note: 'Netflix rounds cover Medium algorithms and system design depth.' },
  // Product companies
  stripe:    { easy: 40,  medium: 80,  hard: 15,  note: 'Stripe focuses more on API/system design but still expects Medium fluency.' },
  shopify:   { easy: 40,  medium: 80,  hard: 10,  note: 'Shopify interviews are Medium-centric with an emphasis on clean code.' },
  openai:    { easy: 50,  medium: 100, hard: 25,  note: 'OpenAI engineering bar is high; strong Medium + some Hard coverage needed.' },
  // Default tier (midsize / startup)
  default:   { easy: 30,  medium: 60,  hard: 10,  note: 'For most roles, 60+ Mediums signals solid DSA readiness.' },
};

function getLcBenchmarks(role, company) {
  const alias = (company || '').toLowerCase().trim();
  const key   = Object.keys(LC_BENCHMARKS_KB).find(k => k !== 'default' && (alias.includes(k) || k.includes(alias)));
  const base  = LC_BENCHMARKS_KB[key] || LC_BENCHMARKS_KB.default;

  // ML/research roles need fewer DSA HARDs, more mediums in graphs/DP
  const r = (role || '').toLowerCase();
  if (/ml|machine learning|data sci|research/.test(r)) {
    return { ...base, hard: Math.max(base.hard - 10, 5), note: base.note + ' ML roles weight statistics and data manipulation problems.' };
  }
  if (/frontend|ui /.test(r)) {
    return { easy: Math.round(base.easy * 0.8), medium: Math.round(base.medium * 0.7), hard: Math.max(base.hard - 15, 5),
      note: 'Frontend roles need lighter DSA coverage; focus on arrays, strings and trees.' };
  }
  return base;
}

/* ════════════════════════════════════════════════════════════
   JOB SEARCH LAYER
   Priority: 1) Adzuna API  2) company knowledge base  3) null    :)
   ═══════════════════════════════════════════════════════════ */


const COMPANY_KB = {
  google: {
    name: 'Google',
    roles: [
      { pattern: /frontend|ui |react|angular|vue/, requiredSkills: ['JavaScript','TypeScript','React or Angular or Vue','HTML/CSS','Accessibility (WCAG)','Performance (Core Web Vitals)','Testing (Jest/Karma)','Git'], niceToHave: ['Lit/Web Components','Chrome DevTools profiling','i18n'], description: 'Google expects mastery of web fundamentals, accessibility, and performance. Bar is L4–L5 SWE.' },
      { pattern: /backend|sre|site reliability|infrastructure|platform|cloud/, requiredSkills: ['Go or Java or C++','Distributed Systems','Kubernetes / Borg','SQL + Spanner','gRPC','Monitoring (Prometheus)','System Design (at scale)'], niceToHave: ['Protobuf','BigQuery','Pub/Sub'], description: 'Backend roles demand distributed systems depth and on-call readiness.' },
      { pattern: /machine learning|ml |ai |data sci/, requiredSkills: ['Python','TensorFlow or JAX','ML Theory (stats, linear algebra)','Large-scale Data Pipelines','Feature Engineering','Model Evaluation','Experiment design'], niceToHave: ['TPU training','Vertex AI','BigQuery ML'], description: 'Google AI roles require strong research background plus production ML systems.' },
      { pattern: /./, requiredSkills: ['Data Structures & Algorithms (LeetCode Hard)','System Design','Languages (Python/Java/Go/C++)','Testing','Git / Code Review'], niceToHave: ['Open-source contributions','Tech writing'], description: 'All Google SWE roles require algorithmic thinking at a high bar plus coding excellence.' },
    ],
  },
  meta: {
    name: 'Meta',
    roles: [
      { pattern: /frontend|ui |react/, requiredSkills: ['React','JavaScript','TypeScript','GraphQL (Relay)','Performance profiling','Accessibility','Product thinking'], niceToHave: ['Hack/PHP','Relay','Recoil'], description: 'Meta frontend engineers work on React (which Meta created) at massive scale.' },
      { pattern: /backend|infra|platform|distributed/, requiredSkills: ['Python or C++ or Java','Distributed Systems','Databases (MySQL/Cassandra/TAO)','Microservices','Messaging (Kafka)','System Design'], niceToHave: ['Thrift RPC','Hack','ZippyDB'], description: 'Backend at Meta means planet-scale systems and deep distributed knowledge.' },
      { pattern: /./, requiredSkills: ['Algorithms (LeetCode Medium-Hard)','System Design (Meta scale)','Coding in Python/Java/C++','Behavioral (STAR)'], niceToHave: ['FAANG referral','ML fundamentals'], description: 'Meta interviews with 2–3 coding + system design rounds.' },
    ],
  },
  amazon: {
    name: 'Amazon',
    roles: [
      { pattern: /frontend|ui |react/, requiredSkills: ['React','TypeScript','HTML/CSS','Performance','REST APIs','Accessibility','AWS fundamentals'], niceToHave: ['Next.js','CloudFront','A/B testing'], description: 'Amazon frontend interviewers weight Leadership Principles heavily alongside technical depth.' },
      { pattern: /backend|sde|software dev|java|python/, requiredSkills: ['Java or Python or Go','REST / gRPC API Design','DynamoDB or RDS','AWS (Lambda, SQS, S3, EC2)','Microservices','Distributed Systems','OOP Design Patterns'], niceToHave: ['CDK/CloudFormation','Step Functions','Kinesis'], description: 'Amazon SDE roles are AWS-centric; expect 14 Leadership Principles questions.' },
      { pattern: /./, requiredSkills: ['Algorithms (Medium)','Object-Oriented Design','System Design (AWS native)','Leadership Principles (STAR)','API Design'], niceToHave: ['AWS Certification','Open-source on GitHub'], description: 'Amazon combines coding + LP behavioral + design rounds at SDE II.' },
    ],
  },
  microsoft: {
    name: 'Microsoft',
    roles: [
      { pattern: /frontend|ui |react|azure portal/, requiredSkills: ['TypeScript','React or Angular','CSS / Design tokens','Accessibility (ARIA)','Performance','Git / ADO','REST APIs'], niceToHave: ['Fluent UI','Azure Static Web Apps','Playwright testing'], description: 'Microsoft invests heavily in accessibility and TypeScript across all web surfaces.' },
      { pattern: /backend|cloud|azure|devops|platform/, requiredSkills: ['C# / .NET or Java','Azure (AKS, Service Bus, Cosmos DB)','REST API Design','Microservices','CI/CD (Azure DevOps)','Kubernetes'], niceToHave: ['Bicep/Terraform','Azure AI Services','gRPC'], description: 'Azure engineering requires deep cloud-native patterns and .NET proficiency.' },
      { pattern: /./, requiredSkills: ['Algorithms (Medium)','OOP Design','System Design','C# or Java or TypeScript','Azure fundamentals'], niceToHave: ['Open source contributions','GitHub presence'], description: 'Microsoft rounds: coding + OOP design + behavioral growth mindset.' },
    ],
  },
  stripe: {
    name: 'Stripe',
    roles: [
      { pattern: /frontend|ui |react|dashboard/, requiredSkills: ['React','TypeScript','CSS-in-JS','REST API integration','Testing (Jest + RTL)','Performance','Web Security basics'], niceToHave: ['Stripe.js','storybook','Figma collaboration'], description: 'Stripe cares deeply about API ergonomics and developer experience in frontend work.' },
      { pattern: /./, requiredSkills: ['API Design (RESTful principles)','Distributed Payments knowledge','Ruby or Go or Java','Reliability engineering','Testing culture','Data modeling (PostgreSQL)'], niceToHave: ['PCI-DSS awareness','Kafka','Protobufs'], description: 'Stripe is payments infrastructure — expect reliability, correctness, and API design depth.' },
    ],
  },
  apple: {
    name: 'Apple',
    roles: [
      { pattern: /ios|swift|macos|cocoa|objective-c/, requiredSkills: ['Swift','Objective-C','SwiftUI + UIKit','Core Data / CoreML','Instruments profiling','HIG compliance','TestFlight CI/CD'], niceToHave: ['Metal','RealityKit','SPM'], description: 'Apple platform roles require deep native expertise and pixel-perfect quality.' },
      { pattern: /./, requiredSkills: ['Algorithms','System design (privacy-first)','Preferred: C++/Swift/Python','Attention to detail','Hardware/software co-design awareness'], niceToHave: ['Security/cryptography','Compilers','Embedded systems'], description: 'Apple values craftspersonship and discretion. Expect hardware-aware system design.' },
    ],
  },
  netflix: {
    name: 'Netflix',
    roles: [
      { pattern: /frontend|ui |react|player|streaming/, requiredSkills: ['React','TypeScript','Video streaming (MSE/EME)','Performance (TTI, rebuffering)','A/B testing','REST APIs','Accessibility'], niceToHave: ['DRM','HLS/DASH','CDN tuning'], description: 'Netflix frontend is about streaming quality at scale — performance obsessed.' },
      { pattern: /./, requiredSkills: ['Java or Python or Node.js','Microservices (Hystrix/resilience)','Cassandra / DynamoDB','Kafka','Chaos engineering','Cloud (AWS)','System Design (at massive scale)'], niceToHave: ['Spinnaker','GraphQL federation','Druid'], description: 'Netflix backend = Freedom & Responsibility culture, cloud-native at 200M+ users.' },
    ],
  },
  shopify: {
    name: 'Shopify',
    roles: [
      { pattern: /frontend|ui |react/, requiredSkills: ['React','TypeScript','Polaris Design System','GraphQL','Remix / Hydrogen','Testing','Performance'], niceToHave: ['Liquid templating','Theme extensions','Checkout UI extensions'], description: 'Shopify frontend engineers work on merchant tools at e-commerce scale.' },
      { pattern: /./, requiredSkills: ['Ruby on Rails','GraphQL API','MySQL / ActiveRecord','Kafka','Kubernetes (GKE)','Data modeling','CI/CD'], niceToHave: ['Sorbet (Ruby types)','Lua scripting','Temporal workflows'], description: 'Shopify backend is Rails-centric. Deep GraphQL and data integrity skills valued.' },
    ],
  },
  openai: {
    name: 'OpenAI',
    roles: [
      { pattern: /frontend|ui |react/, requiredSkills: ['React','TypeScript','Streaming APIs (SSE)','WebSockets','REST + OpenAI API integration','State management (Zustand)','Performance'], niceToHave: ['Edge functions','LLM prompt engineering','Tailwind'], description: 'OpenAI frontend roles build ChatGPT and API playground — real-time streaming core.' },
      { pattern: /ml|research|training|llm/, requiredSkills: ['Python','PyTorch','Transformer architectures','RLHF','Distributed training (NCCL)','CUDA basics','Experiment tracking'], niceToHave: ['JAX','TPU experience','Red-teaming'], description: 'OpenAI research/ML requires strong ML theory + large-scale training experience.' },
      { pattern: /./, requiredSkills: ['Python or TypeScript','API design','Distributed systems','LLM API usage','System design'], niceToHave: ['Safety awareness','ML fundamentals'], description: 'OpenAI hires product engineers who understand LLM capabilities and limitations.' },
    ],
  },
};

/** Look up a company in the KB, match to the right role pattern */
function lookupCompanyKB(role, company) {
  if (!company) return null;
  const alias = company.toLowerCase().trim();
  // find KB entry by partial match
  const key = Object.keys(COMPANY_KB).find(k => alias.includes(k) || k.includes(alias));
  if (!key) return null;
  const profile = COMPANY_KB[key];
  const matched = profile.roles.find(r => r.pattern.test(role.toLowerCase())) || profile.roles[profile.roles.length - 1];
  return {
    matchType: 'exact',
    title: role + ' at ' + profile.name,
    company: profile.name,
    url: null,
    snippet: matched.description,
    requiredSkills: matched.requiredSkills,
    niceToHave: matched.niceToHave || [],
    source: 'nexus-kb',
  };
}

/** Search Adzuna job board (free tier, ~250 calls/day) */
async function searchAdzuna(role, company) {
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return null;

  const encode = s => encodeURIComponent(s);
  const base   = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=3&content-type=application/json`;

  // Pass 1 — exact role + company
  let url = `${base}&what_phrase=${encode(role)}&company=${encode(company || '')}`;
  try {
    const r1 = await fetch(url, { timeout: 6000 });
    if (r1.ok) {
      const d1 = await r1.json();
      if (d1.results && d1.results.length > 0) {
        const job = d1.results[0];
        return {
          matchType: 'exact',
          title: job.title,
          company: job.company?.display_name || company,
          url: job.redirect_url,
          snippet: (job.description || '').slice(0, 600),
          requiredSkills: [],  // will be extracted by AI
          source: 'adzuna',
        };
      }
    }
  } catch (_) {}

  // Pass 2 — role only, no company filter (find similar)
  if (company) {
    url = `${base}&what_phrase=${encode(role)}`;
    try {
      const r2 = await fetch(url, { timeout: 6000 });
      if (r2.ok) {
        const d2 = await r2.json();
        if (d2.results && d2.results.length > 0) {
          const job = d2.results[0];
          return {
            matchType: 'similar',
            title: job.title,
            company: job.company?.display_name || 'Similar company',
            url: job.redirect_url,
            snippet: (job.description || '').slice(0, 600),
            requiredSkills: [],
            source: 'adzuna',
          };
        }
      }
    } catch (_) {}
  }

  return null;
}

/** Orchestrator: KB → Adzuna → null (AI will use general knowledge) */
async function findJobListing(role, company) {
  // Priority 1: our curated company knowledge base
  const kb = lookupCompanyKB(role, company);
  if (kb) return kb;

  // Priority 2: live Adzuna search
  const adzuna = await searchAdzuna(role, company);
  if (adzuna) return adzuna;

  // Priority 3: no listing found → tell AI to use best-practice pattern
  return {
    matchType: 'bestPractice',
    title: role,
    company: company || 'industry standard',
    url: null,
    snippet: null,
    requiredSkills: [],
    source: 'ai-inference',
  };
}

/* ────────────────────────────────────────────────────────────
   DB helpers (flat-file)
   ──────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────
   Hire-Readiness score (0-100%)
   Based on: skills matched vs required, task progress, LC readiness
   ──────────────────────────────────────────────────────────── */
function calcHireReadiness(plan) {
  // 1. Skill coverage (40 pts) — what % of required skills user already has
  const so = plan.skillsOverview || {};
  const theyWant = so.theyWant || [];
  const required = theyWant.filter(t => t.required);
  const hasRequired = required.filter(t => t.userHasIt).length;
  const skillScore = required.length > 0 ? (hasRequired / required.length) * 40 : 20;

  // 2. Task execution (40 pts) — how far through the roadmap
  const allTasks = (plan.executionPlan || []).flatMap(p => p.tasks);
  const doneTasks = allTasks.filter(t => t.isDone).length;
  const taskScore = allTasks.length > 0 ? (doneTasks / allTasks.length) * 40 : 0;

  // 3. DSA readiness (20 pts)
  const lcB = plan.lcBenchmarks;
  const lcS = plan.lcStats;
  let dsaScore = 10; // default: user hasn't synced
  if (lcB && lcS) {
    const easyOk   = lcS.easy   >= lcB.easy   * 0.8 ? 1 : lcS.easy   / Math.max(lcB.easy, 1);
    const mediumOk = lcS.medium >= lcB.medium * 0.8 ? 1 : lcS.medium / Math.max(lcB.medium, 1);
    const hardOk   = lcS.hard   >= lcB.hard   * 0.7 ? 1 : lcS.hard   / Math.max(lcB.hard, 1);
    dsaScore = ((easyOk + mediumOk + hardOk) / 3) * 20;
  }

  const total = Math.round(skillScore + taskScore + dsaScore);
  const label = total >= 85 ? 'Hire-Ready'
    : total >= 65 ? 'Strong Candidate'
    : total >= 40 ? 'In Progress'
    : 'Building Foundation';

  return { total: Math.min(total, 100), label, skillScore: Math.round(skillScore), taskScore: Math.round(taskScore), dsaScore: Math.round(dsaScore) };
}



/* ────────────────────────────────────────────────────────────
   Nexus Score formula (server-authoritative)
   40% Skill Coverage + 40% Execution Progress + 20% Momentum
   ──────────────────────────────────────────────────────────── */
function calcNexusScore(plan) {
  const allSkills    = Object.values(plan.skillMatrix ?? {}).flat();
  const mastered     = allSkills.filter(s => s.status === 'mastered').length;
  const totalSkills  = allSkills.length || 1;
  const skillPct     = mastered / totalSkills;

  const allTasks     = (plan.executionPlan ?? []).flatMap(p => p.tasks);
  const doneTasks    = allTasks.filter(t => t.isDone).length;
  const totalTasks   = allTasks.length || 1;
  const taskPct      = doneTasks / totalTasks;

  const streak       = plan.streak ?? 0;
  const momentumPct  = Math.min(streak / 7, 1);

  const raw = (skillPct * 400) + (taskPct * 400) + (momentumPct * 200);
  return {
    total:             Math.round(raw),
    skillCoverage:     Math.round(skillPct * 400),
    executionProgress: Math.round(taskPct * 400),
    momentum:          Math.round(momentumPct * 200),
  };
}

/* ────────────────────────────────────────────────────────────
   Today's Focus algorithm
   Walk incomplete tasks in active phase, sum timeEstimate until >= hoursPerDay
   ──────────────────────────────────────────────────────────── */
function calcTodaysFocus(plan) {
  const hoursPerDay = plan.target?.hoursPerDay ?? 2;
  let budget = hoursPerDay;
  const focus = [];

  for (const phase of (plan.executionPlan ?? [])) {
    if (phase.status === 'completed') continue;
    for (const task of phase.tasks) {
      if (task.isDone) continue;
      focus.push({ ...task, phaseId: phase.phase, phaseTitle: phase.title });
      budget -= task.timeEstimate;
      if (budget <= 0) break;
    }
    if (budget <= 0) break;
  }
  return focus;
}

/* ────────────────────────────────────────────────────────────
   Recalculate ETA
   ──────────────────────────────────────────────────────────── */
function calcETA(plan) {
  const hoursPerDay  = plan.target?.hoursPerDay ?? 2;
  const allTasks     = (plan.executionPlan ?? []).flatMap(p => p.tasks);
  const remainHours  = allTasks.filter(t => !t.isDone).reduce((s, t) => s + t.timeEstimate, 0);
  const totalDays    = Math.ceil(remainHours / hoursPerDay);
  const target       = new Date();
  target.setDate(target.getDate() + totalDays);
  return { remainHours, totalDays, targetDate: target.toISOString().split('T')[0] };
}

/* ────────────────────────────────────────────────────────────
   Sync skill matrix status based on completed tasks
   A skill → "mastered" when all tasks tagged with it are done
   ──────────────────────────────────────────────────────────── */
function syncSkillMatrix(plan) {
  const allTasks = (plan.executionPlan ?? []).flatMap(p => p.tasks);
  const skillTaskMap = {};
  allTasks.forEach(t => {
    (t.skills ?? []).forEach(s => {
      if (!skillTaskMap[s]) skillTaskMap[s] = { done: 0, total: 0 };
      skillTaskMap[s].total++;
      if (t.isDone) skillTaskMap[s].done++;
    });
  });

  const matrix = plan.skillMatrix ?? {};
  return Object.fromEntries(
    Object.entries(matrix).map(([cat, skills]) => [
      cat,
      skills.map(skill => {
        const counts = skillTaskMap[skill.name];
        if (!counts) return skill;
        if (counts.done === counts.total && counts.total > 0) return { ...skill, status: 'mastered' };
        if (counts.done > 0) return { ...skill, status: 'learning' };
        return skill;
      }),
    ])
  );
}

/* ────────────────────────────────────────────────────────────
   GET /api/aim/lc-stats/:userId
   Returns user's solved counts by difficulty from Practice DB
   ──────────────────────────────────────────────────────────── */
router.get('/lc-stats/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { byDifficulty } = await db.getSolvedWithMeta(userId);
    const easy   = byDifficulty?.Easy   || 0;
    const medium = byDifficulty?.Medium || 0;
    const hard   = byDifficulty?.Hard   || 0;
    return res.json({ easy, medium, hard, total: easy + medium + hard });
  } catch (err) {
    return res.json({ easy: 0, medium: 0, hard: 0, total: 0 });
  }
});

/* ────────────────────────────────────────────────────────────
   AI Integration — Gemini 2.0
   ──────────────────────────────────────────────────────────── */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    // Strip markdown fences if present
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    try {
      return JSON.parse(json);
    } catch (parseErr) {
      console.error('[aim] Gemini JSON parse failed. Raw output snippet:\n', raw.slice(0, 500));
      return null;
    }
  } catch (e) {
    console.error('[aim] Gemini network/API error:', e.message);
    return null;
  }
}

const buildPrompt = ({ role, company, skills, resumeText, githubData, hoursPerDay, timeline, lcStats }, jobSource) => {
  const lcBlock = lcStats
    ? `\n## User's LeetCode Progress\nEasy solved: ${lcStats.easy} | Medium solved: ${lcStats.medium} | Hard solved: ${lcStats.hard}\nAssess DSA readiness for this role. Add an "lcBenchmarks" key in your JSON with: { "easy": <int min required>, "medium": <int min required>, "hard": <int min required>, "verdict": "needs_work"|"good"|"strong", "insight": "<1-sentence AI assessment>" }\n`
    : `\n## LeetCode Progress: user did not provide LC stats. Still include "lcBenchmarks": { "easy": <int>, "medium": <int>, "hard": <int>, "verdict": "needs_work", "insight": "<benchmark summary for this role/company>" } in the JSON response.\n`;

  const resumeBlock = resumeText && resumeText.length > 30
    ? `\n## User Resume (extracted text)\nUse this to accurately determine CURRENT skill levels. Anything present in the resume means the user has real experience with it.\n---\n${resumeText.slice(0, 2000)}\n---\n`
    : '';

  const repoBlock = githubData && Array.isArray(githubData.repos) && githubData.repos.length
    ? githubData.repos.map((r, i) => {
        const parts = [`${i + 1}. **${r.name}**${r.language ? ' [' + r.language + ']' : ''}${r.stars ? ' ⭐' + r.stars : ''}`];
        if (r.description) parts.push(`   Description: ${r.description}`);
        if (r.readmeExcerpt && r.readmeExcerpt.trim()) parts.push(`   README: ${r.readmeExcerpt.trim().slice(0, 500)}...`);
        return parts.join('\n');
      }).join('\n\n')
    : '';

  const ghBlock = githubData
    ? `\n## GitHub Profile: @${githubData.username}\nPublic repos: ${githubData.publicRepos} | Top languages by repo count: ${(githubData.topLangs || []).join(', ')}\n${
        repoBlock
          ? `\n## Projects the User Has Already Built (from GitHub README analysis):\n${repoBlock}\n\nUSE THESE PROJECTS TO:\n- Set currentLevel HIGHER for any skill demonstrated in these projects (treat as proven proficiency, not self-reported).\n- SKIP topics they have clearly already mastered — do NOT include them in the execution plan.\n- In proofOfWork, explicitly reference and EXTEND their existing projects rather than starting from scratch.\n- In executionPlan tasks, call out how each step connects to or builds upon their existing work.\n`
          : 'Use the top languages as strong evidence of proficiency when computing currentLevel in skillGap and mastered/learning status in skillMatrix.\n'
      }`
    : '';

  const jdBlock = jobSource && jobSource.matchType !== 'bestPractice' && (jobSource.snippet || (jobSource.requiredSkills && jobSource.requiredSkills.length))
    ? `\n## Real Job Data Found (${jobSource.matchType === 'exact' ? 'Exact match at ' + jobSource.company : 'Similar role — ' + jobSource.company})\nJob Title : ${jobSource.title}\nRequired  : ${jobSource.requiredSkills && jobSource.requiredSkills.length ? jobSource.requiredSkills.join(', ') : 'see description below'}\n${jobSource.niceToHave && jobSource.niceToHave.length ? 'Nice-to-have: ' + jobSource.niceToHave.join(', ') : ''}\nDescription excerpt: ${(jobSource.snippet || '').slice(0, 400)}\n\nUSE THIS JD DATA as the ground truth for requiredLevel in skillGap and skill status in skillMatrix.\n`
    : `\n## No specific JD found — use your expert knowledge of top-tier ${company || 'tech'} engineering standards.\n`;

  return `You are an expert technical recruiter and learning path designer.
Return ONLY a valid JSON object (no markdown, no explanation).${jdBlock}${resumeBlock}${ghBlock}${lcBlock}
Target Role: ${role}
Target Company: ${company || 'a top tech company'}
Self-reported skills: ${skills || 'none specified'}
Study time: ${hoursPerDay || 2} hours/day
Timeline: ${timeline || '6 months'}

IMPORTANT personalization rules:
- If resume text is provided above, use it as the primary source of truth for what the user currently knows. Set currentLevel higher (6–8) for skills mentioned in the resume.
- If GitHub project READMEs are provided above, read each one carefully and treat demonstrated skills as PROVEN (not self-reported). Set currentLevel 7–9 for any skill the user has shipped in a real project. Reference their specific project names in the executionPlan and proofOfWork sections.
- If GitHub top languages are provided (but no READMEs), treat them as confirmed proficiencies and set those skills to at least learning/mastered status.
- If neither resume nor GitHub is provided, use only the self-reported skills (lower confidence — be conservative with currentLevel).
- requiredLevel values must reflect the ACTUAL bar for ${company || 'this company'} — pull from the JD data if provided, otherwise use industry standards.
- The roadmap must be SPECIFIC to what the user is missing, not a generic curriculum. Never suggest learning something the user has already shipped.

Return this EXACT JSON structure:
{
  "skillGap": [
    { "skill": "string", "currentLevel": <0-10 int>, "requiredLevel": <0-10 int> }
  ],
  "skillMatrix": {
    "CategoryName": [
      { "name": "string", "status": "mastered" | "learning" | "locked" }
    ]
  },
  "estimatedHours": <total int>,
  "lcBenchmarks": { "easy": <int>, "medium": <int>, "hard": <int>, "verdict": "needs_work"|"good"|"strong", "insight": "<string>" },
  "executionPlan": [
    {
      "phase": <int>,
      "title": "string",
      "estimatedWeeks": <int>,
      "requiredSkills": ["string"],
      "tasks": [
        { "id": "p1t1", "title": "string", "timeEstimate": <hours float>, "isDone": false, "skills": ["string"] }
      ]
    }
  ],
  "proofOfWork": [
    {
      "title": "string — specific project name",
      "why": "string — exactly why this signals readiness at ${company || 'this company'}",
      "what": "string — what to build, concrete deliverable",
      "signals": ["string — what this demonstrates to a hiring manager"],
      "difficulty": "beginner" | "intermediate" | "advanced",
      "estimatedHours": <int>
    }
  ],
  "resumeProjects": [
    {
      "title": "string — project name as it would appear on a resume",
      "stack": ["string — key tech used"],
      "description": "string — 2-3 sentence project overview",
      "highlights": ["string — resume bullet point, starting with an action verb + metric, e.g. 'Engineered a real-time feed serving 10k concurrent users using Redis pub/sub, reducing latency by 40%'"],
      "whyItMatters": "string — why this project specifically impresses recruiters at ${company || 'this company'}",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "estimatedHours": <int>
    }
  ],
  "careerRoadmap": {
    "summary": "string — 3-4 sentence honest assessment: where user is now, what the gap is, what it will take, and how realistic the timeline is",
    "milestones": [
      {
        "label": "string — e.g. '30 Days', '3 Months', '6 Months'",
        "goal": "string — concrete, measurable goal by this milestone",
        "actions": ["string — specific action to take"]
      }
    ],
    "interviewStrategy": {
      "overview": "string — how to approach the interview process for ${company || 'this company'} specifically",
      "rounds": ["string — describe each interview round and what to prepare"],
      "tips": ["string — insider tip specific to ${company || 'this company'}'s hiring culture"]
    },
    "doAndDont": {
      "do": ["string — critical thing to do"],
      "dont": ["string — common mistake to avoid at ${company || 'this company'} specifically"]
    }
  }
}

Rules:
- skillGap: 6-10 skills. Base requiredLevel on JD data (if provided). currentLevel = honest assessment from resume/github/self-reported skills.
- skillMatrix: 4 categories (Languages, Frameworks, Databases, Tools, Concepts). 4-20 skills total. JD required skills appear as mastered/learning based on user's actual evidence.
- estimatedHours: realistic total accounting for user's current level (100-500).
- executionPlan: 3-4 phases. Phase 1 status "in-progress", rest "locked". Each phase 3-6 tasks. Total task hours ≈ estimatedHours. Tasks must address the actual gaps — not things the user already knows. Task IDs: "p{phase}t{index}" format.
- proofOfWork: 3-4 high-signal projects specific to ${company || 'this company'}'s engineering culture. NOT generic tutorials. Each project should be deployable and GitHub-linkable. Reference the user's existing skills where possible — build on strengths, fill gaps.
- resumeProjects: 4-5 projects the user can realistically build in their timeline and put on their resume. Each must have 2-3 strong resume bullet points starting with an action verb and including a quantified impact/metric. Build on the user's EXISTING skills — don't suggest projects that require skills they haven't started learning yet.
- careerRoadmap: Be honest, specific, and company-aware. Make milestones measurable. Interview rounds should reflect ${company || 'this company'}'s ACTUAL process (e.g. Google: phone screen → 2 technical rounds → system design → Googleyness). Do/don't tips must be company-specific — not generic advice.`;
};

/* ────────────────────────────────────────────────────────────
   RICH MOCK FALLBACK (role-aware)
   ──────────────────────────────────────────────────────────── */
/* Compute verdict from user's actual counts vs benchmarks */
function computeLcVerdict(lcStats, benchmarks) {
  if (!lcStats) return 'needs_work';
  const easyOk   = lcStats.easy   >= benchmarks.easy   * 0.8;
  const mediumOk = lcStats.medium >= benchmarks.medium * 0.8;
  const hardOk   = lcStats.hard   >= benchmarks.hard   * 0.7;
  if (easyOk && mediumOk && hardOk) return 'strong';
  if (mediumOk) return 'good';
  return 'needs_work';
}

function getMockResumeProjects(role) {
  const r = (role || '').toLowerCase();
  if (/frontend|react|vue|angular|ui/.test(r)) return [
    { title: 'Real-Time Dashboard (React + WebSockets)', stack: ['React', 'Node.js', 'Socket.io', 'Chart.js'], description: 'A live analytics dashboard that streams data via WebSockets and renders interactive charts. Supports multi-user sessions with per-user data isolation.', highlights: ['Built a WebSocket data pipeline serving 500+ concurrent connections, reducing data latency by 60% vs polling', 'Implemented React context + reducer pattern for global state, cutting re-renders by 40%', 'Designed a responsive grid layout with CSS Grid that adapts across 5 breakpoints'], whyItMatters: 'Demonstrates real-time frontend architecture — a common pattern in FAANG product dashboards', difficulty: 'intermediate', estimatedHours: 25 },
    { title: 'Component Library with Storybook', stack: ['React', 'TypeScript', 'Storybook', 'CSS-in-JS'], description: 'A typed React component library with 20+ components, documented in Storybook with visual regression tests via Chromatic.', highlights: ['Shipped 20+ reusable components used across 3 internal projects, reducing UI dev time by 35%', 'Authored TypeScript generics for form components, achieving 100% type safety', 'Set up automated visual regression testing via Chromatic on every PR'], whyItMatters: 'Shows system-level UI thinking — exactly what senior FE engineers do at scale', difficulty: 'intermediate', estimatedHours: 30 },
    { title: 'E-Commerce SPA with Cart & Checkout', stack: ['React', 'Redux Toolkit', 'Node.js', 'Stripe API'], description: 'A fully functional e-commerce SPA with product listings, cart management, and Stripe payment integration. Deployed on Vercel with SSR via Next.js.', highlights: ['Integrated Stripe Checkout with webhook validation, processing test payments end-to-end', 'Optimised bundle size by 42% via code splitting and lazy loading', 'Deployed to Vercel with CI/CD; P99 Lighthouse score of 92'], whyItMatters: 'Full product story with payments — proves you can ship complete features, not just components', difficulty: 'intermediate', estimatedHours: 35 },
  ];
  if (/backend|api|node|java|go|spring|server/.test(r)) return [
    { title: 'Distributed Task Queue (Node.js + Redis)', stack: ['Node.js', 'Redis', 'BullMQ', 'Docker', 'PostgreSQL'], description: 'A horizontally scalable job queue system supporting priority queues, retries, and dead-letter queues. Includes a monitoring dashboard built with Express.', highlights: ['Processed 50k+ background jobs/day with 99.97% success rate using BullMQ + Redis Cluster', 'Designed dead-letter queue and exponential back-off retry, reducing failed job rate by 85%', 'Containerised with Docker Compose; CI/CD via GitHub Actions with zero-downtime deploys'], whyItMatters: 'Task queues are infrastructure-level engineering — signals backend depth at system scale', difficulty: 'advanced', estimatedHours: 40 },
    { title: 'API Gateway with Auth & Rate Limiting', stack: ['Node.js', 'Express', 'JWT', 'Redis', 'PostgreSQL'], description: 'A production-grade API gateway handling authentication (JWT + refresh tokens), per-user rate limiting via Redis sliding window, and request logging.', highlights: ['Implemented JWT refresh-token rotation with Redis blacklist, eliminating token replay attacks', 'Built Redis sliding-window rate limiter supporting 1k req/min per user with sub-1ms overhead', 'Wrote 85+ integration tests with Supertest achieving 94% code coverage'], whyItMatters: 'Auth + rate limiting are day-1 problems at every backend company — this proves you can solve them correctly', difficulty: 'intermediate', estimatedHours: 28 },
  ];
  if (/ml|machine learning|data sci|ai|nlp|pytorch|llm/.test(r)) return [
    { title: 'Fine-Tuned Sentiment Classifier (HuggingFace)', stack: ['Python', 'PyTorch', 'HuggingFace Transformers', 'FastAPI', 'Docker'], description: 'Fine-tuned DistilBERT on a custom dataset for 3-class sentiment analysis. Served via FastAPI with a Dockerfile and tracked with MLflow.', highlights: ['Fine-tuned DistilBERT achieving 91.4% F1 on proprietary dataset, outperforming GPT-3.5 zero-shot by 7%', 'Deployed inference endpoint via FastAPI + Docker; p95 latency <120ms', 'Tracked 15 experiments in MLflow; identified dropout=0.3 as optimal for this corpus'], whyItMatters: 'Shows full ML lifecycle — data → training → evaluation → deployment — exactly what ML engineers do in production', difficulty: 'advanced', estimatedHours: 35 },
    { title: 'RAG-Powered Document Q&A System', stack: ['Python', 'LlamaIndex', 'OpenAI API', 'FAISS', 'FastAPI'], description: 'A retrieval-augmented generation system that ingests PDF documents, chunks and embeds them, and answers natural language questions with source citations.', highlights: ['Built end-to-end RAG pipeline ingesting 500-page PDFs with 85% answer accuracy on held-out eval set', 'Implemented hybrid BM25 + dense retrieval reducing hallucination rate by 40% vs naive RAG', 'Exposed via FastAPI with streaming responses; integrated RAGAS evaluation framework'], whyItMatters: 'RAG is the dominant enterprise AI pattern — strong signal for any ML/AI engineer role', difficulty: 'advanced', estimatedHours: 30 },
  ];
  return [
    { title: 'Full-Stack SaaS Starter (Next.js + Prisma)', stack: ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL', 'Stripe'], description: 'A production-ready SaaS boilerplate with auth, billing, and multi-tenancy. Users can subscribe to plans, manage billing, and access role-based features.', highlights: ['Built multi-tenant SaaS with Stripe subscription billing; supports 3 pricing tiers', 'Implemented JWT + session-based auth with OAuth (GitHub/Google) using NextAuth.js', 'Achieved 95 Lighthouse performance score with Next.js ISR and image optimisation'], whyItMatters: 'Demonstrates full product ownership — architecture, auth, payments, and deployment', difficulty: 'advanced', estimatedHours: 50 },
    { title: 'CLI Dev Tool (Node.js)', stack: ['Node.js', 'TypeScript', 'Commander.js', 'npm'], description: 'A publishable CLI tool that solves a real developer problem (e.g., scaffolding, bulk file ops, Git automation). Published to npm with full test coverage.', highlights: ['Published npm package with 200+ weekly downloads — demonstrates real-world adoption', 'Built interactive prompts using Inquirer.js; supports 8 sub-commands with full --help docs', 'Achieved 96% test coverage with Jest; CI pipeline runs on Node 18/20/22'], whyItMatters: 'A published npm tool signals strong engineering fundamentals and product thinking — rare for new grads', difficulty: 'intermediate', estimatedHours: 20 },
  ];
}

function getMockCareerRoadmap(role, company) {
  const co = (company || 'a top tech company');
  return {
    summary: `To land a ${role} role at ${co}, you need to systematically close the skill gaps identified above while building proof-of-work that signals hiring-bar readiness. The path requires consistent daily work — expect 3–6 months depending on your current level. The most critical leverage point is building 1–2 strong projects and solving at least 80 medium LeetCode problems.`,
    milestones: [
      { label: '30 Days', goal: 'Complete Phase 1 of the Execution Plan and solve 30 LeetCode Mediums', actions: ['Solve 1 LeetCode problem daily (easy → medium)', 'Complete all Phase 1 tasks in your checklist', 'Pick one resume project and scaffold it'] },
      { label: '3 Months', goal: 'Have 2 deployable projects on GitHub and reach 80 LeetCode Mediums', actions: ['Ship your top-priority resume project with a README and live demo', 'Start Phase 2 of the execution plan', 'Do 2 mock interviews on Pramp or Interviewing.io', 'Apply to 5 companies to get interview reps'] },
      { label: '6 Months', goal: 'Be fully interview-ready and have active applications at target companies', actions: ['Complete execution plan (all phases)', 'Have 3 projects on GitHub with README + live demos', 'Solve 100+ mediums and 20+ hards on LeetCode', `Apply to ${co} and 10 comparable companies`] },
    ],
    interviewStrategy: {
      overview: `${co}'s interview process is rigorous but follows a predictable structure. Prepare specifically for each round type — do not treat it as one monolithic "coding test".`,
      rounds: [
        'Recruiter screen (30 min): Background, motivation, compensation expectations. Know your resume cold.',
        'Technical phone screen (45–60 min): 1–2 coding problems (medium difficulty). Focus on correctness first, then optimise.',
        'Virtual onsite — Coding rounds (x2): Medium–hard LeetCode style. Think aloud, clarify before coding, test with examples.',
        'Virtual onsite — System Design: Design a scalable system (e.g., URL shortener, news feed, rate limiter). Know CAP theorem, caching, load balancing.',
        'Behavioural / Culture fit: STAR format stories. Prepare 5–7 situations covering leadership, conflict, failure, and impact.',
      ],
      tips: [
        `${co} values clarity of communication as much as correctness — talk through your thinking even when you're stuck`,
        'Always clarify constraints and edge cases before writing a single line of code — interviewers mark this positively',
        'For system design, start with requirements, then capacity estimation, then high-level design — don\'t jump to databases first',
        'Prepare questions to ask the interviewer — it signals genuine interest and product thinking',
      ],
    },
    doAndDont: {
      do: [
        'Build and ship at least one end-to-end project that solves a real problem — not a tutorial clone',
        'Practice explaining your code complexity (Big O) out loud, not just writing it',
        'Research the team and product before each interview — mention specific features you find interesting',
        'Apply to multiple companies simultaneously to create competing offers and reduce pressure',
      ],
      dont: [
        'Don\'t skip system design prep even for junior roles — it\'s increasingly tested earlier',
        `Don\'t wait until you feel "100% ready" — apply when you hit 70% of the skill bar`,
        'Don\'t list skills on your resume you can\'t explain in depth under pressure',
        `Don\'t ignore ${co}'s engineering blog and tech talks — they reveal what the team values`,
      ],
    },
  };
}

/* ────────────────────────────────────────────────────────────
   Proof-of-Work projects — company/role specific
   ──────────────────────────────────────────────────────────── */
function getProofOfWork(role, company) {
  const r = (role + ' ' + (company || '')).toLowerCase();
  const co = (company || '').toLowerCase();

  // company-specific overrides
  if (co === 'google' || co === 'alphabet') {
    return [
      { title: 'Distributed Key-Value Store', why: 'Google SWEs build infrastructure at scale — this demonstrates you understand consistency, replication, and CAP theorem', what: 'Build a single-node KV store in Go/Python with a REST API, then add write-ahead logging and a basic leader election protocol', signals: ['Systems thinking', 'Distributed systems fundamentals', 'Low-level data structures'], difficulty: 'advanced', estimatedHours: 40 },
      { title: 'PageRank Visualizer', why: 'Directly relevant to Google\'s core — shows you can implement graph algorithms on real data', what: 'Crawl 500 pages starting from a seed URL, build a directed graph, run PageRank, visualize with D3.js', signals: ['Graph algorithms', 'Web crawling', 'Data visualization'], difficulty: 'intermediate', estimatedHours: 25 },
      { title: 'Search Autocomplete System', why: 'Mirrors Google Search internals — Trie + prefix ranking signals strong core CS fundamentals', what: 'Implement a Trie-based autocomplete engine with frequency-weighted ranking, serve via REST, and build a clean search UI', signals: ['Data structures', 'Algorithm optimization', 'Full-stack execution'], difficulty: 'intermediate', estimatedHours: 20 },
    ];
  }
  if (co === 'meta' || co === 'facebook' || co === 'instagram') {
    return [
      { title: 'Real-Time Activity Feed', why: 'Meta\'s core products are built on social graph + activity feeds — this proves product-grade engineering', what: 'Build a social feed where users follow each other; posts fan-out to followers in real-time via WebSockets + Redis pub/sub', signals: ['Real-time systems', 'Database design', 'Scalability thinking'], difficulty: 'advanced', estimatedHours: 35 },
      { title: 'AR Filter Prototype (React Three Fiber)', why: 'Meta\'s 3D/AR investment is massive — a working AR prototype shows you can learn emerging stacks fast', what: 'Use React Three Fiber + face-api.js to build a live webcam face filter with 3D overlay (similar to Instagram filters)', signals: ['3D/WebGL', 'Canvas performance', 'Creative engineering'], difficulty: 'intermediate', estimatedHours: 22 },
      { title: 'Graph API Query Explorer', why: 'Meta Graph API is central to their developer ecosystem — building a query tool shows deep API design understanding', what: 'Build a visual GraphQL explorer with schema introspection, query building, and result trees (think: mini GraphiQL)', signals: ['GraphQL mastery', 'Developer tooling', 'UX engineering'], difficulty: 'intermediate', estimatedHours: 18 },
    ];
  }
  if (co === 'amazon' || co === 'aws') {
    return [
      { title: 'Serverless E-Commerce API', why: 'Amazon\'s customer obsession + operational excellence — this proves you can build production-ready serverless architecture', what: 'Build a product catalog + cart + order API with AWS Lambda + API Gateway + DynamoDB, including IAM roles and CI/CD via GitHub Actions', signals: ['AWS services', 'Serverless architecture', 'DevOps mindset'], difficulty: 'advanced', estimatedHours: 40 },
      { title: 'Recommendation Engine (Collaborative Filtering)', why: 'Amazon\'s "customers who bought X also bought Y" is their most impactful feature — understanding it signals product depth', what: 'Implement user-based and item-based collaborative filtering on a public dataset (MovieLens), expose as a REST endpoint', signals: ['ML fundamentals', 'Data engineering', 'Product thinking'], difficulty: 'intermediate', estimatedHours: 28 },
      { title: 'S3-Compatible Object Storage (Mini)', why: 'Building a mini-S3 clone shows you deeply understand blob storage internals — directly relevant to AWS SWE interviews', what: 'Implement bucket CRUD, object upload/download, presigned URLs, and multipart upload in Node.js or Go', signals: ['Storage systems', 'REST API design', 'Binary data handling'], difficulty: 'advanced', estimatedHours: 35 },
    ];
  }
  if (co === 'microsoft') {
    return [
      { title: 'VS Code Extension', why: 'Microsoft\'s developer tools DNA — building a real extension used by real devs is the ultimate proof of VS Code ecosystem depth', what: 'Build a VS Code extension that adds a custom sidebar panel (e.g., snippet manager, color theme wizard) and publish to the Marketplace', signals: ['TypeScript mastery', 'Extension APIs', 'Developer empathy'], difficulty: 'intermediate', estimatedHours: 20 },
      { title: 'Azure-Deployed Microservices App', why: 'Azure is Microsoft\'s core business — fluency in Azure deployment is a day-one requirement for most Microsoft SWE roles', what: 'Build 2 microservices (Node.js + FastAPI), containerize them, deploy to Azure Container Apps with Azure SQL, and wire up Azure Monitor alerts', signals: ['Cloud-native architecture', 'Azure services', 'Ops mindset'], difficulty: 'advanced', estimatedHours: 38 },
      { title: 'Real-Time Collaboration Tool (SharePoint-like)', why: 'Teams, SharePoint, Loop — Microsoft\'s entire productivity suite runs on real-time collaboration. This shows you get the hard parts.', what: 'Build a markdown document editor with live multi-user editing using CRDTs (Yjs) + WebSockets and presence indicators', signals: ['CRDTs / OT', 'WebSockets', 'Concurrency'], difficulty: 'advanced', estimatedHours: 32 },
    ];
  }
  if (co === 'netflix') {
    return [
      { title: 'Video Streaming Service (HLS)', why: 'Netflix\'s core infra is adaptive bitrate streaming — building a working HLS player proves media engineering depth', what: 'Transcode a video into HLS segments with FFmpeg, serve via Node.js, and build an HLS.js player that adapts bitrate based on bandwidth', signals: ['Media engineering', 'FFmpeg', 'Adaptive streaming'], difficulty: 'advanced', estimatedHours: 35 },
      { title: 'A/B Testing Framework', why: 'Netflix runs 1000s of A/B tests simultaneously — a home-built experimentation engine shows you think like a Netflix engineer', what: 'Build a feature flag + experiment assignment service with traffic splitting, event tracking, and a dashboard showing conversion per variant', signals: ['Experimentation thinking', 'Data modeling', 'Backend architecture'], difficulty: 'intermediate', estimatedHours: 28 },
      { title: 'Chaos Engineering Dashboard', why: 'Netflix invented Chaos Monkey — building a controlled failure injection tool signals Chaos Engineering maturity', what: 'Create a CLI + dashboard that can inject latency, kill processes, or drop network packets on a docker-compose app and track recovery time', signals: ['Resilience engineering', 'DevOps', 'System thinking'], difficulty: 'advanced', estimatedHours: 30 },
    ];
  }
  if (co === 'stripe') {
    return [
      { title: 'Payments SDK from Scratch', why: 'Stripe\'s product is a developer SDK — building your own payments integration layer from first principles shows you understand their engineering values deeply', what: 'Implement a mini-Stripe: card tokenization, charge API, webhook event delivery with retries, and idempotency keys in Node.js', signals: ['API design', 'Security fundamentals', 'Developer experience'], difficulty: 'advanced', estimatedHours: 40 },
      { title: 'Financial Ledger System', why: 'Stripe\'s core is a double-entry ledger at scale — building one proves you understand financial-grade correctness guarantees', what: 'Build an immutable double-entry ledger API (no UPDATE/DELETE) with balance sheet generation and audit trail in PostgreSQL', signals: ['Database design', 'Correctness > speed', 'Financial systems'], difficulty: 'intermediate', estimatedHours: 25 },
      { title: 'Webhook Delivery System', why: 'Stripe sends billions of webhooks — a durable, at-least-once delivery system is a core Stripe engineering challenge', what: 'Build a webhook delivery queue with exponential backoff retries, delivery logs, HMAC signature validation, and a dead-letter queue', signals: ['Queue systems', 'Reliability engineering', 'API security'], difficulty: 'advanced', estimatedHours: 28 },
    ];
  }
  if (co === 'openai' || co === 'anthropic' || co === 'deepmind') {
    return [
      { title: 'Fine-Tuned LLM Classifier', why: 'AI-first companies want engineers who can work at the model layer, not just call APIs — fine-tuning a model end-to-end proves this', what: 'Fine-tune Mistral-7B or Llama-3-8B on a domain-specific dataset (e.g., code review, medical QnA) using LoRA, evaluate with BLEU and human eval', signals: ['Model fine-tuning', 'Data preparation', 'Evaluation frameworks'], difficulty: 'advanced', estimatedHours: 45 },
      { title: 'Production RAG Pipeline', why: 'RAG is the dominant pattern for LLM-based products — a production-quality one with evals separates you from tutorial-level candidates', what: 'Build a document Q&A system with chunking, embedding (OpenAI/local), FAISS retrieval, re-ranking, and an evaluation harness (RAGAS)', signals: ['RAG architecture', 'Vector search', 'LLM evaluation'], difficulty: 'intermediate', estimatedHours: 30 },
      { title: 'Toy Transformer from Scratch', why: 'OpenAI literally publishes Karpathy\'s nanoGPT — understanding transformers at the weight level is a green flag in interviews', what: 'Implement a character-level GPT in pure PyTorch (no HuggingFace): multi-head attention, positional encoding, train on Shakespeare', signals: ['Deep learning fundamentals', 'Transformer architecture', 'Mathematical maturity'], difficulty: 'advanced', estimatedHours: 35 },
    ];
  }

  // Role-based fallbacks
  if (/frontend|react|ui|vue|angular/.test(r)) {
    return [
      { title: 'Design System Component Library', why: 'Every product-grade engineering team maintains a design system — building one end-to-end shows you can work at the intersection of design and engineering', what: 'Create 10+ accessible React components (Button, Modal, Select, Table, etc.) with Storybook docs, full TypeScript types, and a published npm package', signals: ['Component architecture', 'Accessibility', 'DX engineering'], difficulty: 'intermediate', estimatedHours: 30 },
      { title: 'Full-Stack SaaS Product (Marketing → Dashboard)', why: 'Hiring managers want engineers who ship products, not demos — a real SaaS with auth, billing and real users is the ultimate proof', what: 'Build a SaaS with landing page, auth (Clerk/Auth.js), dashboard, one core feature, Stripe subscription billing, and deploy to Vercel', signals: ['Product ownership', 'Full-stack depth', 'Business thinking'], difficulty: 'advanced', estimatedHours: 50 },
      { title: 'Performance-Optimized Dashboard', why: 'Frontend performance is a top hiring signal for senior roles — hitting Core Web Vitals at scale separates junior from senior candidates', what: 'Build a data-heavy dashboard (charts, tables, real-time updates) that scores 90+ on Lighthouse with virtualized lists, code splitting, and PWA support', signals: ['Core Web Vitals', 'Performance optimization', 'React patterns'], difficulty: 'intermediate', estimatedHours: 22 },
    ];
  }
  if (/backend|api|node|java|go|spring|server/.test(r)) {
    return [
      { title: 'Rate Limiter as a Service', why: 'Rate limiting is in every backend interview — a production implementation with multiple algorithms shows systems depth', what: 'Implement token bucket + sliding window rate limiters as a Redis-backed middleware library, with a dashboard showing current limits per key', signals: ['Distributed systems', 'Redis patterns', 'Middleware design'], difficulty: 'intermediate', estimatedHours: 20 },
      { title: 'Event-Sourced Task Manager', why: 'Event sourcing is used at Airbnb, LinkedIn, Uber — understanding it signals senior backend maturity', what: 'Build a task management API using event sourcing (append-only event log) with PostgreSQL, projections for current state, and a replay endpoint', signals: ['Event sourcing / CQRS', 'Database design', 'Audit logging'], difficulty: 'advanced', estimatedHours: 32 },
      { title: 'Multi-Tenant REST API', why: 'Most B2B SaaS companies need multi-tenancy — building it correctly (row-level security, isolated schemas) is a senior-level skill', what: 'Build a multi-tenant API with per-tenant database isolation (PostgreSQL RLS), JWT auth, plan-based feature flags, and Temporal-based background jobs', signals: ['Multi-tenancy patterns', 'Security', 'API design'], difficulty: 'advanced', estimatedHours: 38 },
    ];
  }
  if (/ml|machine learning|data sci|ai|nlp|pytorch|llm/.test(r)) {
    return [
      { title: 'End-to-End ML Pipeline (train → serve → monitor)', why: 'Companies want ML engineers who own the full lifecycle, not just Jupyter notebooks — this is that proof', what: 'Train a model, package it with FastAPI + Docker, deploy to a cloud VM, add Prometheus + Grafana monitoring for model drift and latency', signals: ['MLOps', 'Model serving', 'Production mindset'], difficulty: 'advanced', estimatedHours: 42 },
      { title: 'Custom Embeddings Search Engine', why: 'Vector search is the foundation of modern AI products — building one from scratch (not using a hosted service) proves deep understanding', what: 'Build a semantic search engine for a text corpus using custom sentence-transformer embeddings, HNSW indexing, and a query interface', signals: ['Embeddings', 'Vector indexing', 'Information retrieval'], difficulty: 'intermediate', estimatedHours: 26 },
      { title: 'Kaggle Competition Top-20% Writeup', why: 'Feature engineering + rigorous experimentation is harder than model architecture — a competition writeup with your approach demonstrates this', what: 'Compete in or replicate a Kaggle tabular competition, document your feature engineering pipeline, ensembling strategy, and lessons learned in a public GitHub repo', signals: ['Feature engineering', 'Model evaluation', 'Analytical rigor'], difficulty: 'intermediate', estimatedHours: 30 },
    ];
  }
  // default: full-stack
  return [
    { title: 'Clone of a Real Product (with your twist)', why: 'Replicating a known product\'s core architecture proves you can read and match real engineering quality bars', what: 'Clone the core feature of a real app (Notion sync engine, GitHub Issues, Slack channels) — focus on the hard engineering problem, not the UI polish', signals: ['Systems thinking', 'Architecture decisions', 'Execution'], difficulty: 'intermediate', estimatedHours: 35 },
    { title: 'Open Source Contribution (merged PR)', why: 'A merged PR in an OSS project used by real people is the highest-signal proof of work available — no hiring manager ignores it', what: 'Find a popular open source project in your stack, fix a real bug or implement a requested feature, write tests, and get it merged', signals: ['Code quality', 'Communication in review', 'Real-world impact'], difficulty: 'intermediate', estimatedHours: 15 },
    { title: 'Public Technical Blog (3 deep-dives)', why: 'Writing proves you can communicate technical decisions — a core skill at every level. Hiring managers read your blog.', what: 'Write 3 in-depth technical posts: one on a hard problem you solved, one on a system design decision, one on a tool/library you built or improved', signals: ['Communication', 'Technical depth', 'Knowledge sharing'], difficulty: 'beginner', estimatedHours: 12 },
  ];
}

function richMock({ role, company, skills, resumeText, githubData, hoursPerDay, lcStats }) {
  const r = (role + ' ' + (company || '')).toLowerCase();

  // Build a unified skill set from all 3 sources: typed skills, GitHub langs, resume keywords
  const fromTyped  = (skills || '').split(/,\s*/).map(s => s.trim().toLowerCase()).filter(Boolean);
  const fromGitHub = (githubData && Array.isArray(githubData.topLangs))
    ? githubData.topLangs.map(l => l.toLowerCase())
    : [];
  const fromResume = resumeText
    ? (resumeText.toLowerCase().match(
        /\b(react|next\.?js|vue|angular|svelte|typescript|javascript|html|css|tailwind|sass|less|node\.?js|express|fastapi|django|flask|spring|rails|laravel|python|java|go|rust|c\+\+|c#|ruby|swift|kotlin|php|scala|r\b|matlab|sql|postgresql|mysql|mongodb|redis|firebase|dynamodb|cassandra|elasticsearch|docker|kubernetes|aws|azure|gcp|git|github|ci\/cd|graphql|rest|grpc|websockets|redux|zustand|mobx|vite|webpack|jest|vitest|pytest|cypress|playwright|linux|bash|terraform|ansible|kafka|rabbitmq|spark|hadoop|pytorch|tensorflow|scikit|pandas|numpy|machine learning|deep learning|system design|microservices|agile|figma)\b/g
      ) || [])
    : [];

  const currentSet = new Set([...fromTyped, ...fromGitHub, ...fromResume]);

  // Check if user has a skill — exact or partial token match across all sources
  const hasSkill = s => {
    const tokens = s.toLowerCase().split(/[\/\s(\-]+/).filter(t => t.length > 2);
    return [...currentSet].some(u => tokens.some(t => u.includes(t) || t.includes(u)));
  };

  // Level: mastered via resume/github = 7-8, typed only = 6, not found = 1
  const level = s => {
    if (!hasSkill(s)) return 1;
    const token = s.toLowerCase().split(' ')[0];
    // Higher confidence if from resume or github (not just typed)
    const fromEvidence = [...fromGitHub, ...fromResume].some(u => u.includes(token) || token.includes(u));
    return fromEvidence ? 8 : 6;
  };

  const status = s => hasSkill(s) ? (level(s) >= 8 ? 'mastered' : 'learning') : 'locked';

  if (/frontend|react|ui|vue|angular/.test(r)) {
    return {
      skillGap: [
        { skill: 'React', currentLevel: level('react'), requiredLevel: 9 },
        { skill: 'TypeScript', currentLevel: level('typescript'), requiredLevel: 8 },
        { skill: 'CSS / Tailwind', currentLevel: level('css'), requiredLevel: 7 },
        { skill: 'Testing (Vitest)', currentLevel: level('testing'), requiredLevel: 7 },
        { skill: 'Accessibility', currentLevel: level('accessibility'), requiredLevel: 6 },
        { skill: 'Performance', currentLevel: level('performance'), requiredLevel: 7 },
        { skill: 'State Management', currentLevel: level('zustand'), requiredLevel: 7 },
      ],
      skillMatrix: {
        Languages: [
          { name: 'JavaScript', status: status('javascript') },
          { name: 'TypeScript', status: status('typescript') },
          { name: 'HTML/CSS', status: status('html') },
        ],
        Frameworks: [
          { name: 'React', status: status('react') },
          { name: 'Next.js', status: status('next.js') },
          { name: 'Tailwind CSS', status: status('tailwind') },
        ],
        Tools: [
          { name: 'Vite', status: status('vite') },
          { name: 'Vitest / Jest', status: status('vitest') },
          { name: 'Git / GitHub', status: status('git') },
        ],
        Concepts: [
          { name: 'Accessibility (a11y)', status: status('accessibility') },
          { name: 'Core Web Vitals', status: status('performance') },
          { name: 'Design Systems', status: status('design') },
        ],
      },
      estimatedHours: 180,
      lcBenchmarks: (() => {
        const b = getLcBenchmarks(role, company);
        const v = computeLcVerdict(lcStats, b);
        return { easy: b.easy, medium: b.medium, hard: b.hard, verdict: v, insight: b.note };
      })(),
      executionPlan: [
        { phase: 1, title: 'TypeScript & Modern React', estimatedWeeks: 3, status: 'in-progress', requiredSkills: ['TypeScript', 'React'], tasks: [
          { id: 'p1t1', title: 'Complete TypeScript Handbook exercises', timeEstimate: 8, isDone: false, skills: ['TypeScript'] },
          { id: 'p1t2', title: 'Migrate one project component to TS', timeEstimate: 4, isDone: false, skills: ['TypeScript', 'React'] },
          { id: 'p1t3', title: 'Build a reusable component library (3 components)', timeEstimate: 6, isDone: false, skills: ['React'] },
          { id: 'p1t4', title: 'Implement custom hooks for data fetching (SWR)', timeEstimate: 4, isDone: false, skills: ['React'] },
        ]},
        { phase: 2, title: 'Testing & Accessibility', estimatedWeeks: 3, status: 'locked', requiredSkills: ['Testing', 'TypeScript'], tasks: [
          { id: 'p2t1', title: 'Set up Vitest + React Testing Library', timeEstimate: 3, isDone: false, skills: ['Vitest / Jest'] },
          { id: 'p2t2', title: 'Write tests for 5 components (80% coverage)', timeEstimate: 8, isDone: false, skills: ['Vitest / Jest'] },
          { id: 'p2t3', title: 'Fix 10 accessibility violations (Lighthouse audit)', timeEstimate: 6, isDone: false, skills: ['Accessibility (a11y)'] },
          { id: 'p2t4', title: 'Add skip-navigation and ARIA labels', timeEstimate: 3, isDone: false, skills: ['Accessibility (a11y)'] },
        ]},
        { phase: 3, title: 'Performance & Next.js', estimatedWeeks: 4, status: 'locked', requiredSkills: ['Next.js', 'Performance'], tasks: [
          { id: 'p3t1', title: 'Score 90+ on Lighthouse for a real project', timeEstimate: 6, isDone: false, skills: ['Core Web Vitals'] },
          { id: 'p3t2', title: 'Build a full-stack app with Next.js 14 (App Router)', timeEstimate: 20, isDone: false, skills: ['Next.js'] },
          { id: 'p3t3', title: 'Implement image optimization + lazy loading', timeEstimate: 4, isDone: false, skills: ['Core Web Vitals', 'Next.js'] },
          { id: 'p3t4', title: 'Deploy to Vercel with CI/CD', timeEstimate: 3, isDone: false, skills: ['Git / GitHub'] },
        ]},
      ],
      proofOfWork: getProofOfWork(role, company),
      resumeProjects: getMockResumeProjects(role),
      careerRoadmap: getMockCareerRoadmap(role, company),
    };
  }

  if (/backend|api|node|java|go|spring|server/.test(r)) {
    return {
      skillGap: [
        { skill: 'System Design', currentLevel: level('system design'), requiredLevel: 9 },
        { skill: 'Docker', currentLevel: level('docker'), requiredLevel: 8 },
        { skill: 'PostgreSQL / SQL', currentLevel: level('postgresql'), requiredLevel: 8 },
        { skill: 'Redis Caching', currentLevel: level('redis'), requiredLevel: 7 },
        { skill: 'REST API Design', currentLevel: level('rest'), requiredLevel: 8 },
        { skill: 'Kubernetes', currentLevel: level('kubernetes'), requiredLevel: 6 },
        { skill: 'Message Queues', currentLevel: level('kafka'), requiredLevel: 6 },
      ],
      skillMatrix: {
        Languages: [
          { name: 'Node.js / JS', status: status('node.js') },
          { name: 'Go', status: 'locked' },
          { name: 'Python', status: status('python') },
        ],
        Databases: [
          { name: 'PostgreSQL', status: status('postgresql') },
          { name: 'Redis', status: status('redis') },
          { name: 'MongoDB', status: status('mongodb') },
        ],
        Infrastructure: [
          { name: 'Docker', status: status('docker') },
          { name: 'Kubernetes', status: status('kubernetes') },
          { name: 'AWS / GCP', status: status('aws') },
        ],
        Concepts: [
          { name: 'System Design', status: status('system design') },
          { name: 'REST / gRPC', status: status('rest') },
          { name: 'Message Queues', status: status('kafka') },
          { name: 'Caching Patterns', status: status('caching') },
        ],
      },
      estimatedHours: 220,
      lcBenchmarks: (() => {
        const b = getLcBenchmarks(role, company);
        const v = computeLcVerdict(lcStats, b);
        return { easy: b.easy, medium: b.medium, hard: b.hard, verdict: v, insight: b.note };
      })(),
      executionPlan: [
        { phase: 1, title: 'Databases & Caching', estimatedWeeks: 3, status: 'in-progress', requiredSkills: ['PostgreSQL', 'Redis'], tasks: [
          { id: 'p1t1', title: 'Complete PostgreSQL performance tuning tutorial', timeEstimate: 6, isDone: false, skills: ['PostgreSQL'] },
          { id: 'p1t2', title: 'Build a cache-aside pattern with Redis', timeEstimate: 5, isDone: false, skills: ['Redis'] },
          { id: 'p1t3', title: 'Design a normalized schema for a social network', timeEstimate: 4, isDone: false, skills: ['PostgreSQL'] },
          { id: 'p1t4', title: 'Implement rate limiting with Redis sliding window', timeEstimate: 4, isDone: false, skills: ['Redis', 'REST / gRPC'] },
        ]},
        { phase: 2, title: 'Docker & Microservices', estimatedWeeks: 3, status: 'locked', requiredSkills: ['Docker', 'System Design'], tasks: [
          { id: 'p2t1', title: 'Containerize an existing Node.js API', timeEstimate: 4, isDone: false, skills: ['Docker'] },
          { id: 'p2t2', title: 'Docker Compose: API + Postgres + Redis stack', timeEstimate: 5, isDone: false, skills: ['Docker'] },
          { id: 'p2t3', title: 'Design a URL shortener (system design)', timeEstimate: 3, isDone: false, skills: ['System Design'] },
          { id: 'p2t4', title: 'Set up message queue (BullMQ) for async jobs', timeEstimate: 5, isDone: false, skills: ['Message Queues'] },
        ]},
        { phase: 3, title: 'Kubernetes & Scale', estimatedWeeks: 4, status: 'locked', requiredSkills: ['Kubernetes', 'AWS / GCP'], tasks: [
          { id: 'p3t1', title: 'Deploy microservice to Kubernetes (local k3s)', timeEstimate: 8, isDone: false, skills: ['Kubernetes'] },
          { id: 'p3t2', title: 'Set up Horizontal Pod Autoscaler', timeEstimate: 4, isDone: false, skills: ['Kubernetes'] },
          { id: 'p3t3', title: 'Design a distributed cache for 1M req/s', timeEstimate: 3, isDone: false, skills: ['System Design', 'Caching Patterns'] },
          { id: 'p3t4', title: 'Deploy to AWS ECS + RDS', timeEstimate: 6, isDone: false, skills: ['AWS / GCP'] },
        ]},
      ],
      proofOfWork: getProofOfWork(role, company),
      resumeProjects: getMockResumeProjects(role),
      careerRoadmap: getMockCareerRoadmap(role, company),
    };
  }

  if (/ml|machine learning|data sci|ai|nlp|pytorch|llm/.test(r)) {
    return {
      skillGap: [
        { skill: 'PyTorch', currentLevel: level('pytorch'), requiredLevel: 9 },
        { skill: 'MLOps', currentLevel: level('mlops'), requiredLevel: 8 },
        { skill: 'Feature Engineering', currentLevel: level('feature engineering'), requiredLevel: 8 },
        { skill: 'Model Deployment', currentLevel: level('deployment'), requiredLevel: 7 },
        { skill: 'Statistics / Math', currentLevel: level('statistics'), requiredLevel: 8 },
        { skill: 'Transformer Architecture', currentLevel: level('transformers'), requiredLevel: 7 },
      ],
      skillMatrix: {
        Languages: [
          { name: 'Python', status: status('python') },
          { name: 'SQL', status: status('sql') },
        ],
        'ML Frameworks': [
          { name: 'PyTorch', status: status('pytorch') },
          { name: 'scikit-learn', status: status('scikit-learn') },
          { name: 'HuggingFace', status: status('huggingface') },
        ],
        MLOps: [
          { name: 'MLflow', status: status('mlflow') },
          { name: 'FastAPI (serving)', status: status('fastapi') },
          { name: 'Docker', status: status('docker') },
        ],
        Concepts: [
          { name: 'Feature Engineering', status: status('feature engineering') },
          { name: 'Transformers / LLMs', status: status('transformers') },
          { name: 'RAG Pipeline', status: 'locked' },
        ],
      },
      estimatedHours: 260,
      lcBenchmarks: (() => {
        const b = getLcBenchmarks(role, company);
        const v = computeLcVerdict(lcStats, b);
        return { easy: b.easy, medium: b.medium, hard: b.hard, verdict: v, insight: b.note };
      })(),
      executionPlan: [
        { phase: 1, title: 'Deep Learning Foundations', estimatedWeeks: 4, status: 'in-progress', requiredSkills: ['PyTorch', 'Math'], tasks: [
          { id: 'p1t1', title: 'Complete fast.ai Practical Deep Learning (Part 1)', timeEstimate: 15, isDone: false, skills: ['PyTorch'] },
          { id: 'p1t2', title: 'Implement ResNet-18 from scratch', timeEstimate: 8, isDone: false, skills: ['PyTorch'] },
          { id: 'p1t3', title: 'Kaggle: top 20% on a tabular competition', timeEstimate: 10, isDone: false, skills: ['Feature Engineering', 'scikit-learn'] },
        ]},
        { phase: 2, title: 'Transformers & NLP', estimatedWeeks: 4, status: 'locked', requiredSkills: ['HuggingFace', 'PyTorch'], tasks: [
          { id: 'p2t1', title: 'Fine-tune BERT for text classification', timeEstimate: 10, isDone: false, skills: ['HuggingFace', 'PyTorch'] },
          { id: 'p2t2', title: 'Build a RAG pipeline with LlamaIndex', timeEstimate: 8, isDone: false, skills: ['RAG Pipeline', 'HuggingFace'] },
          { id: 'p2t3', title: 'Reproduce an Attention Is All You Need implementation', timeEstimate: 10, isDone: false, skills: ['Transformers / LLMs', 'PyTorch'] },
        ]},
        { phase: 3, title: 'MLOps & Deployment', estimatedWeeks: 3, status: 'locked', requiredSkills: ['MLflow', 'FastAPI', 'Docker'], tasks: [
          { id: 'p3t1', title: 'Track experiments with MLflow (3 runs)', timeEstimate: 5, isDone: false, skills: ['MLflow'] },
          { id: 'p3t2', title: 'Serve model via FastAPI + Docker', timeEstimate: 6, isDone: false, skills: ['FastAPI (serving)', 'Docker'] },
          { id: 'p3t3', title: 'CI/CD pipeline for ML model retraining', timeEstimate: 6, isDone: false, skills: ['MLflow', 'Docker'] },
        ]},
      ],
      proofOfWork: getProofOfWork(role, company),
      resumeProjects: getMockResumeProjects(role),
      careerRoadmap: getMockCareerRoadmap(role, company),
    };
  }

  // default — full-stack / SWE
  return {
    skillGap: [
      { skill: 'Data Structures & Algorithms', currentLevel: level('dsa'), requiredLevel: 9 },
      { skill: 'System Design', currentLevel: level('system design'), requiredLevel: 8 },
      { skill: 'React / Frontend', currentLevel: level('react'), requiredLevel: 7 },
      { skill: 'Node.js / Backend', currentLevel: level('node.js'), requiredLevel: 7 },
      { skill: 'SQL / Databases', currentLevel: level('sql'), requiredLevel: 7 },
      { skill: 'Cloud / AWS', currentLevel: level('aws'), requiredLevel: 6 },
      { skill: 'Testing', currentLevel: level('testing'), requiredLevel: 6 },
    ],
    skillMatrix: {
      Languages: [
        { name: 'JavaScript', status: status('javascript') },
        { name: 'Python', status: status('python') },
        { name: 'TypeScript', status: status('typescript') },
      ],
      Frontend: [
        { name: 'React', status: status('react') },
        { name: 'HTML / CSS', status: status('html') },
      ],
      Backend: [
        { name: 'Node.js', status: status('node.js') },
        { name: 'REST APIs', status: status('rest') },
        { name: 'PostgreSQL', status: status('postgresql') },
      ],
      Infra: [
        { name: 'Git / GitHub', status: status('git') },
        { name: 'Docker', status: status('docker') },
        { name: 'AWS (basics)', status: status('aws') },
      ],
      Concepts: [
        { name: 'System Design', status: status('system design') },
        { name: 'Algorithms', status: status('algorithms') },
        { name: 'Testing', status: status('testing') },
      ],
    },
    estimatedHours: 200,
    lcBenchmarks: (() => {
      const b = getLcBenchmarks(role, company);
      const v = computeLcVerdict(lcStats, b);
      return { easy: b.easy, medium: b.medium, hard: b.hard, verdict: v, insight: b.note };
    })(),
    executionPlan: [
      { phase: 1, title: 'DSA & Problem Solving', estimatedWeeks: 4, status: 'in-progress', requiredSkills: ['Algorithms', 'JavaScript'], tasks: [
        { id: 'p1t1', title: 'Complete NeetCode 75 (Arrays & Hashing, Two Pointers)', timeEstimate: 15, isDone: false, skills: ['Algorithms'] },
        { id: 'p1t2', title: 'Complete NeetCode 75 (Trees, Graphs, Dynamic Programming)', timeEstimate: 15, isDone: false, skills: ['Algorithms'] },
        { id: 'p1t3', title: 'Do 2 timed mock interview sessions (Pramp)', timeEstimate: 4, isDone: false, skills: ['Algorithms'] },
      ]},
      { phase: 2, title: 'Full-Stack Project', estimatedWeeks: 4, status: 'locked', requiredSkills: ['React', 'Node.js', 'PostgreSQL'], tasks: [
        { id: 'p2t1', title: 'Build REST API with Express + PostgreSQL (auth, CRUD)', timeEstimate: 12, isDone: false, skills: ['Node.js', 'PostgreSQL', 'REST APIs'] },
        { id: 'p2t2', title: 'Build React frontend with auth flow', timeEstimate: 10, isDone: false, skills: ['React'] },
        { id: 'p2t3', title: 'Write integration tests (supertest + Vitest)', timeEstimate: 6, isDone: false, skills: ['Testing'] },
        { id: 'p2t4', title: 'Deploy to Render/Railway with CI/CD', timeEstimate: 4, isDone: false, skills: ['Git / GitHub', 'Docker'] },
      ]},
      { phase: 3, title: 'System Design & Cloud', estimatedWeeks: 3, status: 'locked', requiredSkills: ['System Design', 'AWS (basics)'], tasks: [
        { id: 'p3t1', title: 'Design: URL shortener, rate limiter, news feed', timeEstimate: 6, isDone: false, skills: ['System Design'] },
        { id: 'p3t2', title: 'AWS Certified Cloud Practitioner prep (exam)', timeEstimate: 12, isDone: false, skills: ['AWS (basics)'] },
        { id: 'p3t3', title: 'Containerize full-stack app with Docker Compose', timeEstimate: 4, isDone: false, skills: ['Docker'] },
      ]},
    ],
    proofOfWork: getProofOfWork(role, company),
    resumeProjects: getMockResumeProjects(role),
    careerRoadmap: getMockCareerRoadmap(role, company),
  };
}

/* ────────────────────────────────────────────────────────────
   Compute "You Have" vs "They Want" skills overview
   ──────────────────────────────────────────────────────────── */
function computeSkillsOverview(target, aiData, jobSource) {
  // Parse what the user actually listed
  const userRaw = (target.skills || '').split(/,\s*/).map(s => s.trim()).filter(Boolean);
  const lowerSet = new Set(userRaw.map(s => s.toLowerCase()));

  const hasSkill = s => {
    const tokens = s.toLowerCase().split(/[\/\s(\-]+/).filter(t => t.length > 2);
    return [...lowerSet].some(u => tokens.some(t => u.includes(t) || t.includes(u)));
  };

  // "You Have" — user's own skill inventory
  const youHave = userRaw.map(skill => ({
    skill,
    level: 7, // they listed it; they have it
  }));

  // "They Want" — from KB/JD required skills, then niceToHave, then fallback to skillGap top skills
  let theyWant = [];
  const jdRequired  = (jobSource && jobSource.requiredSkills)  || [];
  const jdNice      = (jobSource && jobSource.niceToHave)      || [];

  if (jdRequired.length > 0) {
    jdRequired.forEach(skill => {
      theyWant.push({ skill, required: true,  userHasIt: hasSkill(skill) });
    });
    jdNice.forEach(skill => {
      if (!theyWant.find(t => t.skill.toLowerCase() === skill.toLowerCase())) {
        theyWant.push({ skill, required: false, userHasIt: hasSkill(skill) });
      }
    });
  } else {
    // No JD data — derive from skillGap (take top 8 by requiredLevel)
    const sorted = [...(aiData.skillGap || [])].sort((a, b) => b.requiredLevel - a.requiredLevel).slice(0, 8);
    sorted.forEach(g => {
      theyWant.push({ skill: g.skill, required: true, userHasIt: g.currentLevel >= 5 });
    });
  }

  return { youHave, theyWant };
}

/* ────────────────────────────────────────────────────────────
   Build complete plan from AI/mock output
   ──────────────────────────────────────────────────────────── */
function buildPlan(userId, target, aiData, jobSource) {
  // Only keep skills where user genuinely has a gap (currentLevel < requiredLevel)
  const filteredSkillGap = (aiData.skillGap || []).filter(g => g.currentLevel < g.requiredLevel);

  const skillsOverview = computeSkillsOverview(target, aiData, jobSource);

  // Resolve lcBenchmarks: AI-provided wins, else compute from KB
  let lcBenchmarks = aiData.lcBenchmarks || null;
  if (!lcBenchmarks) {
    const b = getLcBenchmarks(target.role, target.company);
    const v = computeLcVerdict(target.lcStats || null, b);
    lcBenchmarks = { easy: b.easy, medium: b.medium, hard: b.hard, verdict: v, insight: b.note };
  }

  const plan = {
    userId,
    target,
    generatedAt: new Date().toISOString(),
    jobSource:      jobSource || null,
    skillsOverview,
    skillGap:       filteredSkillGap,
    skillMatrix:    aiData.skillMatrix,
    estimatedHours: aiData.estimatedHours,
    lcStats:        target.lcStats   || null,
    lcBenchmarks,
    proofOfWork:    aiData.proofOfWork    || [],
    resumeProjects: aiData.resumeProjects  || [],
    careerRoadmap:  aiData.careerRoadmap   || null,
    executionPlan:  aiData.executionPlan.map((p, i) => ({
      ...p,
      status: i === 0 ? 'in-progress' : 'locked',
    })),
    streak: 0,
    lastActive: null,
    completedToday: [],
    progressHistory: [{
      date: new Date().toISOString(),
      event: 'plan_created',
      nexusScore: 0,
      tasksCompleted: 0,
      note: 'Roadmap generated for ' + (target.role || 'role') + (target.company ? ' @ ' + target.company : ''),
    }],
  };
  const score = calcNexusScore(plan);
  const eta   = calcETA(plan);
  const hireReadiness = calcHireReadiness(plan);
  return { ...plan, nexusScore: score.total, nexusBreakdown: score, eta, hireReadiness };
}

/* ────────────────────────────────────────────────────────────
   POST /api/aim/generate
   ──────────────────────────────────────────────────────────── */
router.post('/generate', async (req, res) => {
  try {
    const { userId, role, company, skills, hoursPerDay, timeline, lcStats, resumeText, githubData } = req.body;
    if (!role) return res.status(400).json({ error: 'role is required' });

    // Normalise lcStats
    const normLcStats = lcStats && typeof lcStats === 'object' && !isNaN(lcStats.easy)
      ? { easy: Number(lcStats.easy) || 0, medium: Number(lcStats.medium) || 0, hard: Number(lcStats.hard) || 0 }
      : null;

    // Merge typed skills + github top languages into one effective skills string
    const ghLangs    = (githubData && Array.isArray(githubData.topLangs)) ? githubData.topLangs : [];
    const userSkills = (skills || '').split(/,\s*/).map(s => s.trim()).filter(Boolean);
    const effectiveSkills = [...new Set([...userSkills, ...ghLangs])].join(', ');

    const target = {
      role,
      company:      company || '',
      skills:       effectiveSkills,
      resumeText:   (resumeText || '').slice(0, 2500),   // up to 2500 chars to AI
      githubData:   githubData || null,
      hoursPerDay:  hoursPerDay || 2,
      timeline:     timeline || '6 months',
      lcStats:      normLcStats,
    };

    console.log(`[aim] Generating plan: ${role} @ ${company || 'any'} | skills="${effectiveSkills.slice(0,80)}" | resume=${target.resumeText.length}chars | github=${githubData ? '@' + githubData.username : 'none'} | lcStats=${JSON.stringify(normLcStats)}`);

    // ── Step 1: find matching job listing ─────────────────────
    let jobSource = null;
    try {
      jobSource = await findJobListing(role, company);
      console.log(`[aim] Job search result: matchType=${jobSource.matchType} source=${jobSource.source} company=${jobSource.company}`);
    } catch (e) {
      console.error('[aim] Job search error:', e.message);
      jobSource = { matchType: 'bestPractice', title: role, company: company || '', url: null, snippet: null, requiredSkills: [], source: 'ai-inference' };
    }

    // ── Step 2: AI skill gap + execution plan ─────────────────
    let aiData = null;
    if (process.env.GEMINI_API_KEY) {
      aiData = await callGemini(buildPrompt(target, jobSource));
    }
    if (!aiData) {
      console.log('[aim] Using rich mock fallback');
      aiData = richMock(target);
      // If KB match, overlay required skills into skillGap requiredLevels
      if (jobSource.requiredSkills && jobSource.requiredSkills.length) {
        const jdSet = new Set(jobSource.requiredSkills.map(s => s.toLowerCase()));
        aiData.skillGap = aiData.skillGap.map(g => {
          const matched = [...jdSet].find(s => s.includes(g.skill.toLowerCase().split(' ')[0]) || g.skill.toLowerCase().includes(s.split(' ')[0]));
          return matched ? { ...g, requiredLevel: Math.max(g.requiredLevel, 8), fromJD: true } : g;
        });
        // Add JD skills not in mock gap
        jobSource.requiredSkills.forEach(skill => {
          const alreadyIn = aiData.skillGap.some(g => g.skill.toLowerCase().includes(skill.toLowerCase().split('/')[0].split(' ')[0]));
          if (!alreadyIn && aiData.skillGap.length < 10) {
            const effSet = new Set(effectiveSkills.split(/,\s*/).map(s => s.trim().toLowerCase()));
            const hasIt = [...effSet].some(u => u.includes(skill.toLowerCase().split(' ')[0]) || skill.toLowerCase().split(' ')[0].includes(u));
            aiData.skillGap.push({ skill, currentLevel: hasIt ? 6 : 1, requiredLevel: 8, fromJD: true });
          }
        });
      }
    }

    const plan = buildPlan(userId || 'anon', target, aiData, jobSource);

    try {
      if (useMongo()) {
        await AimPlan.findOneAndUpdate(
          { userId: plan.userId },
          { $set: { plan, updatedAt: new Date() } },
          { upsert: true, returnDocument: 'after' }
        );
      } else {
        const fileDb = readDB();
        fileDb[plan.userId] = plan;
        writeDB(fileDb);
      }
    } catch (e) {
      console.error('[aim] save error:', e.message);
    }

    res.json({ ok: true, plan });
  } catch (err) {
    console.error('[aim] /generate unhandled error:', err.message || err);
    res.status(500).json({ error: 'Generation failed: ' + (err.message || 'unknown error') });
  }
});

/* ────────────────────────────────────────────────────────────
   PUT /api/aim/task  — mark task done / undone
   Body: { userId, taskId, isDone }
   ──────────────────────────────────────────────────────────── */
router.put('/task', async (req, res) => {
  const { userId = 'anon', taskId, isDone } = req.body;

  let plan;
  if (useMongo()) {
    const doc = await AimPlan.findOne({ userId }).lean();
    if (!doc) return res.status(404).json({ error: 'Plan not found' });
    plan = doc.plan;
  } else {
    const fileDb = readDB();
    plan = fileDb[userId];
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
  }

  // Update task
  let found = false;
  for (const phase of plan.executionPlan) {
    for (const task of phase.tasks) {
      if (task.id === taskId) {
        task.isDone = isDone;
        found = true;
        break;
      }
    }
    if (found) break;
  }
  if (!found) return res.status(404).json({ error: 'Task not found' });

  // Re-lock / unlock phases
  // Rule: each phase unlocks only after all previous phases are completed.
  // If a completed phase has a task unchecked, it reverts to in-progress.
  let prevDone = true;
  for (const phase of plan.executionPlan) {
    if (!prevDone) { phase.status = 'locked'; continue; }
    const allDone = phase.tasks.every(t => t.isDone);
    if (allDone) {
      phase.status = 'completed';
      // prevDone stays true → next phase stays unlocked
    } else {
      // Phase is not fully done — revert completed→in-progress as well
      if (phase.status === 'completed' || phase.status === 'locked') {
        phase.status = 'in-progress';
      }
      prevDone = false;
    }
  }

  // Update streak (simple: mark today as active)
  const today = new Date().toDateString();
  if (isDone) {
    if (plan.lastActive !== today) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      plan.streak = (plan.lastActive === yesterday.toDateString()) ? (plan.streak ?? 0) + 1 : 1;
      plan.lastActive = today;
    }
    if (!plan.completedToday.includes(taskId)) plan.completedToday.push(taskId);
  } else {
    plan.completedToday = (plan.completedToday ?? []).filter(id => id !== taskId);
  }

  // Sync skill matrix + recalculate all derived fields
  plan.skillMatrix    = syncSkillMatrix(plan);
  const score         = calcNexusScore(plan);
  const eta           = calcETA(plan);
  const hireReadiness = calcHireReadiness(plan);
  plan.nexusScore     = score.total;
  plan.nexusBreakdown = score;
  plan.eta            = eta;
  plan.hireReadiness  = hireReadiness;
  plan.todaysFocus    = calcTodaysFocus(plan);

  // Record progress history
  if (!Array.isArray(plan.progressHistory)) plan.progressHistory = [];
  if (isDone) {
    const allDone = (plan.executionPlan || []).flatMap(p => p.tasks).filter(t => t.isDone).length;
    const total   = (plan.executionPlan || []).flatMap(p => p.tasks).length;
    // Record every 5th task completion + every phase completion
    const justCompletedPhase = (plan.executionPlan || []).some(ph =>
      ph.status === 'completed' &&
      !plan.progressHistory.some(h => h.event === 'phase_completed' && h.phaseTitle === ph.title)
    );
    if (justCompletedPhase) {
      const completedPhase = (plan.executionPlan || []).find(ph =>
        ph.status === 'completed' &&
        !plan.progressHistory.some(h => h.event === 'phase_completed' && h.phaseTitle === ph.title)
      );
      plan.progressHistory.push({
        date: new Date().toISOString(),
        event: 'phase_completed',
        phaseTitle: completedPhase ? completedPhase.title : '',
        nexusScore: score.total,
        tasksCompleted: allDone,
        note: 'Completed phase: ' + (completedPhase ? completedPhase.title : ''),
      });
    } else if (allDone % 5 === 0 || allDone === total) {
      plan.progressHistory.push({
        date: new Date().toISOString(),
        event: 'milestone',
        nexusScore: score.total,
        tasksCompleted: allDone,
        note: allDone + '/' + total + ' tasks complete',
      });
    } else {
      // Always record task completion for sparkline data
      plan.progressHistory.push({
        date: new Date().toISOString(),
        event: 'task_done',
        taskTitle: (function() {
          for (const ph of (plan.executionPlan || [])) {
            const t = (ph.tasks || []).find(t => t.id === taskId);
            if (t) return t.title;
          }
          return taskId;
        })(),
        nexusScore: score.total,
        tasksCompleted: allDone,
      });
    }
  }

  try {
    if (useMongo()) {
      await AimPlan.findOneAndUpdate(
        { userId },
        { $set: { plan, updatedAt: new Date() } },
        { upsert: true }
      );
    } else {
      const fileDb = readDB();
      fileDb[userId] = plan;
      writeDB(fileDb);
    }
  } catch (e) {
    console.error('[aim] task save error:', e.message);
  }

  res.json({ ok: true, plan });
});

/* ────────────────────────────────────────────────────────────
   GET /api/aim/plan/:userId
   ──────────────────────────────────────────────────────────── */
router.get('/plan/:userId', async (req, res) => {
  let plan;
  if (useMongo()) {
    const doc = await AimPlan.findOne({ userId: req.params.userId }).lean();
    if (!doc) return res.status(404).json({ error: 'No plan found' });
    plan = doc.plan;
  } else {
    const fileDb = readDB();
    plan = fileDb[req.params.userId];
    if (!plan) return res.status(404).json({ error: 'No plan found' });
  }

  // Backfill new fields that may be missing on older saved plans
  let dirty = false;
  if (!plan.resumeProjects || !plan.resumeProjects.length) {
    plan.resumeProjects = getMockResumeProjects(plan.target && plan.target.role || '');
    dirty = true;
  }
  if (!plan.careerRoadmap) {
    plan.careerRoadmap = getMockCareerRoadmap(
      plan.target && plan.target.role    || '',
      plan.target && plan.target.company || ''
    );
    dirty = true;
  }
  if (!plan.hireReadiness) {
    plan.hireReadiness = calcHireReadiness(plan);
    dirty = true;
  }
  if (!plan.skillsOverview) {
    plan.skillsOverview = computeSkillsOverview(plan.target || {}, plan, plan.jobSource || null);
    dirty = true;
  }
  if (dirty) {
    try {
      if (useMongo()) {
        await AimPlan.findOneAndUpdate(
          { userId: req.params.userId },
          { $set: { plan, updatedAt: new Date() } }
        );
      } else {
        const fileDb = readDB();
        fileDb[req.params.userId] = plan;
        writeDB(fileDb);
      }
    } catch (e) { console.warn('[aim] backfill save error:', e.message); }
  }

  // always compute fresh todaysFocus
  plan.todaysFocus = calcTodaysFocus(plan);
  res.json({ plan });
});

/* ────────────────────────────────────────────────────────────
   POST /api/aim/plan/:userId — full overwrite
   ──────────────────────────────────────────────────────────── */
router.post('/plan/:userId', async (req, res) => {
  try {
    if (useMongo()) {
      await AimPlan.findOneAndUpdate(
        { userId: req.params.userId },
        { $set: { plan: req.body.plan, updatedAt: new Date() } },
        { upsert: true }
      );
    } else {
      const fileDb = readDB();
      fileDb[req.params.userId] = req.body.plan;
      writeDB(fileDb);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ────────────────────────────────────────────────────────────
   GET /api/aim/progress/:userId — full progress history
   Returns the progressHistory array + current nexusScore
   ──────────────────────────────────────────────────────────── */
router.get('/progress/:userId', async (req, res) => {
  try {
    let plan;
    if (useMongo()) {
      const doc = await AimPlan.findOne({ userId: req.params.userId }).lean();
      if (!doc) return res.status(404).json({ error: 'No plan found' });
      plan = doc.plan;
    } else {
      const fileDb = readDB();
      plan = fileDb[req.params.userId];
      if (!plan) return res.status(404).json({ error: 'No plan found' });
    }
    res.json({
      progressHistory: plan.progressHistory || [],
      nexusScore:      plan.nexusScore || 0,
      streak:          plan.streak || 0,
      generatedAt:     plan.generatedAt,
      target:          plan.target,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/aim/experience
   Save a community interview/placement experience to MongoDB.
   Body: { userId, userName, role, company, outcome, title, story, tips, duration, package }
   ───────────────────────────────────────────────────────────── */
router.post('/experience', async (req, res) => {
  if (!useMongo()) {
    return res.status(503).json({ error: 'Database not available. Please try again later.' });
  }

  const { userId, userName, role, outcome, title, story, company, tips, duration, package: pkg } = req.body;

  if (!userId)    return res.status(400).json({ error: 'userId is required.' });
  if (!userName)  return res.status(400).json({ error: 'userName is required.' });
  if (!role)      return res.status(400).json({ error: 'Role is required.' });
  if (!outcome)   return res.status(400).json({ error: 'Outcome is required.' });
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  if (!story || story.trim().length < 30) return res.status(400).json({ error: 'Story must be at least 30 characters.' });

  try {
    const exp = await AimExperience.create({
      userId,
      userName:  userName.trim(),
      role:      role.trim(),
      company:   (company || '').trim(),
      outcome,
      title:     title.trim(),
      story:     story.trim(),
      tips:      Array.isArray(tips) ? tips.filter(t => t.trim()).slice(0, 5) : [],
      duration:  (duration || '').trim(),
      package:   (pkg || '').trim(),
    });

    res.status(201).json({ ok: true, experience: exp });
  } catch (err) {
    console.error('[aim] experience save error:', err.message);
    res.status(500).json({ error: 'Failed to save experience. Please try again.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/aim/experiences
   Fetch paginated community experiences.
   Query: ?page=1&limit=10&outcome=offer&company=Google
   ───────────────────────────────────────────────────────────── */
router.get('/experiences', async (req, res) => {
  if (!useMongo()) {
    return res.json({ experiences: [], total: 0, page: 1, pages: 1 });
  }

  const page    = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit   = Math.min(20, parseInt(req.query.limit, 10) || 10);
  const outcome = req.query.outcome || '';
  const company = req.query.company || '';

  const filter = {};
  if (outcome && outcome !== 'all') filter.outcome = outcome;
  if (company) filter.company = { $regex: company, $options: 'i' };

  try {
    const [experiences, total] = await Promise.all([
      AimExperience.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AimExperience.countDocuments(filter),
    ]);

    res.json({
      experiences,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[aim] experiences fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch experiences.' });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/aim/experience/:id/upvote
   Increment upvote count.
   ───────────────────────────────────────────────────────────── */
router.post('/experience/:id/upvote', async (req, res) => {
  if (!useMongo()) return res.status(503).json({ error: 'DB unavailable' });
  try {
    const exp = await AimExperience.findByIdAndUpdate(
      req.params.id,
      { $inc: { upvotes: 1 } },
      { new: true }
    );
    if (!exp) return res.status(404).json({ error: 'Not found.' });
    res.json({ ok: true, upvotes: exp.upvotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
