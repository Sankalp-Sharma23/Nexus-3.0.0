/**
 * server/routes/resume.js – Resume Builder API endpoints
 *
 * Comprehensive endpoints for:
 *   - Resume CRUD operations
 *   - Resume list/dashboard
 *   - AI enhancement (Gemini integration)
 *   - ATS scoring & analysis
 *   - PDF export & versioning
 *
 * All routes require authentication (provided via JWT token in Authorization header)
 */

const express = require('express');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const { requireAuth } = require('../middleware/auth');
const Resume = require('../models/Resume');
const User = require('../models/User');
const AimPlan = require('../models/AimPlan');
const { mongoReady } = require('../db');

const router = express.Router();

/* ════════════════════════════════════════════════════════════════
   GEMINI HELPER
═════════════════════════════════════════════════════════════════ */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function callGeminiText(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 3000 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (e) {
    console.error('[resume/gemini]', e.message);
    return null;
  }
}

async function callGeminiJSON(prompt) {
  const raw = await callGeminiText(prompt);
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/* ════════════════════════════════════════════════════════════════
   HELPERS & MIDDLEWARE
═════════════════════════════════════════════════════════════════ */

// mongoReady() is imported from ../db

/**
 * ATS Score Calculation Engine
 * Returns: { score, details: { sectionCompleteness, keywordMatch, formattingScore } }
 */
function calculateATSScore(resumeData, targetJD) {
  let score = 0;
  const details = {
    sectionCompleteness: 0,
    keywordMatch: 0,
    formattingScore: 0,
    keywordsFound: [],
    keywordsMissing: [],
  };

  // 1. Section Completeness (40 points max)
  const sections = {
    personal: resumeData.personal?.name?.trim()?.length > 0 ? 1 : 0,
    education: (resumeData.education?.length || 0) > 0 ? 1 : 0,
    skills: (resumeData.skills?.length || 0) > 0 ? 1 : 0,
    experience:
      (resumeData.experiences?.length || 0) + (resumeData.projects?.length || 0) > 0
        ? 1
        : 0,
  };
  const completeSections = Object.values(sections).filter(Boolean).length;
  details.sectionCompleteness = Math.round((completeSections / 4) * 40);
  score += details.sectionCompleteness;

  // 2. Keyword Match vs Target JD (50 points max)
  if (targetJD && targetJD.trim().length > 20) {
    const jdWords = targetJD.toLowerCase().match(/\b[a-z][a-z0-9.+#]{2,}\b/g) || [];
    const stopWords = new Set([
      'the', 'and', 'you', 'for', 'with', 'that', 'have', 'this', 'from', 'they',
      'will', 'your', 'are', 'has', 'can', 'our', 'all', 'been', 'its', 'more',
      'not', 'but', 'was', 'their', 'were', 'which', 'about', 'into', 'than',
    ]);
    const jdKeywords = [...new Set(jdWords.filter(w => !stopWords.has(w)))].slice(0, 50);

    const resumeText = [
      resumeData.personal?.name || '',
      resumeData.personal?.summary || '',
      ...(resumeData.education || []).map(e => `${e.university} ${e.degree}`),
      (resumeData.skills || []).join(' '),
      ...(resumeData.experiences || []).map(e => `${e.role} ${e.organization} ${e.achievements.join(' ')}`),
      ...(resumeData.projects || []).map(p => `${p.title} ${p.description}`),
    ]
      .join(' ')
      .toLowerCase();

    const matched = jdKeywords.filter(k => resumeText.includes(k));
    const unmatched = jdKeywords.filter(k => !resumeText.includes(k)).slice(0, 15);

    const matchPercentage = jdKeywords.length > 0 ? matched.length / jdKeywords.length : 0;
    details.keywordMatch = Math.round(Math.min(matchPercentage * 50, 50));
    details.keywordsFound = matched.slice(0, 15);
    details.keywordsMissing = unmatched;
    score += details.keywordMatch;
  } else {
    // No JD: score based on content richness
    const richness = Math.min(
      (resumeData.skills?.length || 0) * 2 + (resumeData.projects?.length || 0) * 3,
      50
    );
    details.keywordMatch = richness;
    score += richness;
  }

  // 3. Formatting & Length Score (10 points max)
  // Penalize if resume is too short or missing critical sections
  const hasBasicInfo = resumeData.personal?.email && resumeData.personal?.phone;
  const hasEducation = (resumeData.education?.length || 0) > 0;
  const hasSkills = (resumeData.skills?.length || 0) > 0;
  const formattingChecks = [hasBasicInfo, hasEducation, hasSkills].filter(Boolean).length;
  details.formattingScore = Math.round((formattingChecks / 3) * 10);
  score += details.formattingScore;

  return { score: Math.min(100, score), details };
}

/**
 * STAR Method Optimization
 * Transforms raw bullet points into STAR format (Situation, Task, Action, Result)
 */
function optimizeBulletPointsSTAR(text) {
  if (!text || text.trim().length === 0) return text;

  const templates = [
    (action, tech, impact) =>
      `• Architected ${action} leveraging ${tech}, delivering ${impact} to stakeholders`,
    (action, tech, impact) =>
      `• Engineered ${action} using ${tech}, resulting in measurable improvement of ${impact}`,
    (action, tech, impact) =>
      `• Spearheaded ${action} with ${tech}-based solution, achieving ${impact}`,
    (action, tech, impact) =>
      `• Developed and deployed ${action} powered by ${tech}, driving ${impact}`,
  ];

  // Extract tech keywords
  const techStack =
    text.match(
      /\b(React|Node|Python|Java|Go|Rust|AWS|Azure|Docker|Kubernetes|PostgreSQL|MongoDB|TypeScript|JavaScript)\b/gi
    ) || [];
  const uniqueTech = [...new Set(techStack)].slice(0, 2).join(' & ') || 'modern stack';

  // Extract action
  const actionMatch = text.match(/\b(built|created|developed|designed|implemented|deployed)\b.{0,50}/i);
  const action = actionMatch ? actionMatch[0].replace(/\b(I|we|the)\b/gi, '').trim() : 'a solution';

  // Extract impact
  const impactMatch = text.match(/\b(improved|increased|reduced|enhanced|saved|enabled)\b.{0,50}/i);
  const impact = impactMatch ? impactMatch[0].trim() : '10-20% efficiency gains';

  // Return 2-3 STAR-formatted bullets
  return templates
    .slice(0, 2)
    .map(fn => fn(action, uniqueTech, impact))
    .join('\n');
}

/* ════════════════════════════════════════════════════════════════
   CRUD ROUTES
═════════════════════════════════════════════════════════════════ */

/**
 * GET /api/resume   (root — this is what the frontend dashboard calls)
 * GET /api/resume/list  (alias kept for backward compat)
 * Fetch all resumes for the authenticated user
 */
async function listResumes(req, res) {
  // Graceful degradation: if MongoDB is down, return empty list instead of 503
  if (!mongoReady()) {
    return res.json({ resumes: [], _offline: true });
  }
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const resumes = await Resume.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('_id title template targetRole targetCompany atsScore aiEnhanced isDraft createdAt updatedAt');

    return res.json({ resumes: resumes.map(r => r.toCard?.() || r.toJSON?.()) });
  } catch (err) {
    console.error('[resume/list]', err.message);
    return res.status(500).json({ error: 'Failed to fetch resumes' });
  }
}

router.get('/',     requireAuth, listResumes);
router.get('/list', requireAuth, listResumes);

/**
 * POST /api/resume/create
 */
router.post('/create', requireAuth, async (req, res) => {
  if (!mongoReady()) {
    return res.status(503).json({ error: 'Database is currently unavailable. Please try again in a moment.' });
  }

  try {
    const rawId = req.userId;
    if (!rawId) return res.status(401).json({ error: 'Unauthorized' });

    let userId;
    try {
      userId = new mongoose.Types.ObjectId(rawId);
    } catch {
      return res.status(400).json({ error: 'Invalid user session. Please log in again.' });
    }

    const { title, template, targetRole, targetCompany } = req.body;
    const validTemplates = ['classic', 'modern', 'minimal', 'executive', 'tech'];
    const safeTemplate = validTemplates.includes(template) ? template : 'classic';

    const resume = await Resume.create({
      userId,
      title:         title         || 'Untitled Resume',
      template:      safeTemplate,
      targetRole:    targetRole    || '',
      targetCompany: targetCompany || '',
      isDraft:       true,
      atsScore:      0,
    });

    return res.status(201).json({ resume });
  } catch (err) {
    console.error('[resume/create] ERROR:', err.name, err.message);
    return res.status(500).json({ error: 'Failed to create resume: ' + err.message });
  }
});




/**
 * GET /api/resume/import-aim  ← MUST be before /:id so Express doesn't treat
 *                               'import-aim' as an ObjectId
 * Fetches the user's active AimPlan and returns role, company, and JD data
 * so the ResumeWizard can pre-populate the Target Job step.
 */
router.get('/import-aim', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // AimPlan.userId is stored as a plain string (from req.body.userId in /generate)
    // which equals the user's MongoDB ObjectId string
    const aimPlan = await AimPlan.findOne({ userId: userId.toString() }).lean();
    if (!aimPlan || !aimPlan.plan) {
      return res.status(404).json({
        error: 'No Aim plan found. Please create a career goal in the Aim page first.',
      });
    }

    const plan = aimPlan.plan;
    const targetRole    = plan.target?.role    || '';
    const targetCompany = plan.target?.company || '';

    // Build required skills list from skillsOverview + skillGap
    const requiredSkills = [];
    const theyWant = plan.skillsOverview?.theyWant || [];
    theyWant.forEach(s => {
      const name = typeof s === 'string' ? s : (s.name || s.skill || '');
      if (name && !requiredSkills.includes(name)) requiredSkills.push(name);
    });
    (plan.skillGap || []).forEach(g => {
      if ((g.requiredLevel >= 7) && !requiredSkills.includes(g.skill)) {
        requiredSkills.push(g.skill);
      }
    });

    // Construct a JD summary from available plan data
    const jdParts = [];
    if (targetRole)    jdParts.push(`Role: ${targetRole}`);
    if (targetCompany) jdParts.push(`Company: ${targetCompany}`);
    if (requiredSkills.length) jdParts.push(`Required Skills: ${requiredSkills.join(', ')}`);
    const interviewFocus = plan.careerRoadmap?.interviewStrategy?.overview || '';
    if (interviewFocus)  jdParts.push(`Interview Focus: ${interviewFocus}`);

    // Build acquired skills list
    const acquiredSkills = [];
    const youHave = plan.skillsOverview?.youHave || [];
    youHave.forEach(s => {
      const name = typeof s === 'string' ? s : (s.name || s.skill || '');
      if (name && !acquiredSkills.includes(name)) acquiredSkills.push(name);
    });

    const targetJD = jdParts.join('\n');

    return res.json({
      targetRole,
      targetCompany,
      targetJD,
      requiredSkills,
      acquiredSkills,
      executionPlan: plan.executionPlan || [],
      aimSummary: plan.careerRoadmap?.summary || '',
    });
  } catch (err) {
    console.error('[resume/import-aim]', err.message);
    return res.status(500).json({ error: 'Failed to import Aim data: ' + err.message });
  }
});

/**
 * GET /api/resume/:id
 * Fetch a single resume by ID
 */
router.get('/:id', requireAuth, async (req, res) => {
  if (!mongoReady()) {
    return res.status(503).json({ error: 'Database not ready. Please try again shortly.' });
  }
  try {
    const userId = req.userId;
    const { id } = req.params;
    const resume = await Resume.findOne({ _id: id, userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    return res.json({ resume });
  } catch (err) {
    console.error('[resume/get]', err.message);
    return res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

/**
 * PUT /api/resume/:id
 * Update resume content
 */
router.put('/:id', requireAuth, async (req, res) => {
  if (!mongoReady()) {
    return res.status(503).json({ error: 'Database not ready. Please try again shortly.' });
  }
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updateData = req.body;

    const resume = await Resume.findOne({ _id: id, userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const allowedFields = [
      'title', 'template', 'targetJD', 'targetRole', 'targetCompany',
      'personal', 'education', 'skills', 'experiences', 'projects', 'certifications', 'isDraft',
    ];
    allowedFields.forEach(field => { if (field in updateData) resume[field] = updateData[field]; });

    // Auto-calculate ATS score on update
    const atsResult = calculateATSScore(resume.toObject(), resume.targetJD);
    resume.atsScore      = atsResult.score;
    resume.atsKeywords   = atsResult.details.keywordsFound  || [];
    resume.atsMissing    = atsResult.details.keywordsMissing || [];

    await resume.save();
    return res.json({ resume, atsScore: atsResult });
  } catch (err) {
    console.error('[resume/put]', err.message);
    return res.status(500).json({ error: 'Failed to update resume' });
  }
});

/**
 * DELETE /api/resume/:id
 * Archive/soft-delete a resume
 */
router.delete('/:id', requireAuth, async (req, res) => {
  if (!mongoReady()) {
    return res
      .status(503)
      .json({ error: 'Database not ready. Please try again shortly.' });
  }

  try {
    const userId = req.userId || req.user?.id || req.user?._id;
    const { id } = req.params;

    const resume = await Resume.findOneAndDelete({ _id: id, userId });

    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    return res.json({ success: true, message: 'Resume deleted' });
  } catch (err) {
    console.error('[resume/delete]', err.message);
    return res.status(500).json({ error: 'Failed to delete resume' });
  }
});

/* ════════════════════════════════════════════════════════════════
   AI & ATS ENHANCEMENT ROUTES
═════════════════════════════════════════════════════════════════ */

/**
 * POST /api/resume/:id/enhance
 * Use Gemini AI to enhance resume content
 * Body: { sections: ["projects", "experience", "skills"] }
 */
router.post('/:id/enhance', requireAuth, async (req, res) => {
  if (!mongoReady()) {
    return res
      .status(503)
      .json({ error: 'Database not ready. Please try again shortly.' });
  }

  try {
    const userId = req.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    const { sections } = req.body;

    const resume = await Resume.findOne({ _id: id, userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API not configured. Set GEMINI_API_KEY in .env',
      });
    }

    const enhancements = {};
    let totalBulletsGenerated = 0;

    // Enhance Projects
    if (sections.includes('projects') && resume.projects?.length > 0) {
      const projectsText = resume.projects
        .map(
          p =>
            `Project: ${p.title}\nCompany: ${p.company}\nTech: ${p.tech}\nDescription: ${p.description}`
        )
        .join('\n---\n');

      const geminiPrompt = `Transform these project descriptions into professional, ATS-friendly STAR-format bullets. Keep language active, quantify impact where possible, and emphasize technical skills.\n\n${projectsText}`;

      try {
        const enhanced = await callGeminiText(geminiPrompt);
        if (enhanced) {
          enhancements.projects = enhanced;
          const bulletCount = (enhanced.match(/•/g) || []).length;
          totalBulletsGenerated += bulletCount;
        }
      } catch (aiErr) {
        console.warn('[enhance/gemini] Projects enhancement failed:', aiErr.message);
      }
    }

    // Enhance Experiences
    if (sections.includes('experience') && resume.experiences?.length > 0) {
      const experiencesText = resume.experiences
        .map(
          e =>
            `Role: ${e.role}\nOrganization: ${e.organization}\nAchievements: ${e.achievements.join(', ')}`
        )
        .join('\n---\n');

      const geminiPrompt = `Transform these work experience descriptions into impactful STAR-format bullet points. Emphasize quantifiable results, technical contributions, and leadership impact.\n\n${experiencesText}`;

      try {
        const enhanced = await callGeminiText(geminiPrompt);
        if (enhanced) {
          enhancements.experience = enhanced;
          const bulletCount = (enhanced.match(/•/g) || []).length;
          totalBulletsGenerated += bulletCount;
        }
      } catch (aiErr) {
        console.warn('[enhance/gemini] Experience enhancement failed:', aiErr.message);
      }
    }

    // Enhance Skills with JD matching
    if (sections.includes('skills') && resume.targetJD) {
      const currentSkills = (resume.skills || []).join(', ');
      const geminiPrompt = `Given this job description:\n${resume.targetJD}\n\nCurrent skills: ${currentSkills}\n\nSuggest additional relevant technical skills to add. Return only a comma-separated list of 5-10 skills.`;

      try {
        const suggestions = await callGeminiText(geminiPrompt);
        if (suggestions) {
          enhancements.skills = suggestions;
          const newSkills = suggestions
            .split(',')
            .map(s => s.trim())
            .filter(s => s && !resume.skills.includes(s));
          resume.skills.push(...newSkills);
        }
      } catch (aiErr) {
        console.warn('[enhance/gemini] Skills enhancement failed:', aiErr.message);
      }
    }

    resume.aiEnhanced = true;
    resume.enhancementNote = `Enhanced ${sections.join(', ')} with Gemini AI`;
    resume.completedSteps = resume.completedSteps || [];

    await resume.save();

    // Recalculate ATS
    const atsResult = calculateATSScore(resume.toObject(), resume.targetJD);
    resume.atsScore = atsResult.score;

    return res.json({
      success: true,
      resume,
      enhancements,
      stats: { bulletsGenerated: totalBulletsGenerated },
    });
  } catch (err) {
    console.error('[resume/enhance]', err.message);
    return res.status(500).json({ error: 'Enhancement failed' });
  }
});

/**
 * GET /api/resume/:id/ats-analysis
 * Detailed ATS scoring with keyword analysis
 */
router.get('/:id/ats-analysis', requireAuth, async (req, res) => {
  if (!mongoReady()) {
    return res
      .status(503)
      .json({ error: 'Database not ready. Please try again shortly.' });
  }

  try {
    const userId = req.userId || req.user?.id || req.user?._id;
    const { id } = req.params;

    const resume = await Resume.findOne({ _id: id, userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const atsResult = calculateATSScore(resume.toObject(), resume.targetJD);

    return res.json({
      atsScore: atsResult.score,
      details: atsResult.details,
      recommendations: generateATSRecommendations(atsResult),
    });
  } catch (err) {
    console.error('[resume/ats-analysis]', err.message);
    return res.status(500).json({ error: 'ATS analysis failed' });
  }
});

/**
 * Generate actionable ATS recommendations based on score
 */
function generateATSRecommendations(atsResult) {
  const recommendations = [];
  const { score, details } = atsResult;

  if (details.sectionCompleteness < 30) {
    recommendations.push({
      priority: 'high',
      message: 'Complete all resume sections (personal, education, skills, experience)',
    });
  }

  if (details.keywordMatch < 40) {
    recommendations.push({
      priority: 'high',
      message: `Add keywords from job description: ${(details.keywordsMissing || []).slice(0, 5).join(', ')}`,
    });
  }

  if (score < 60) {
    recommendations.push({
      priority: 'medium',
      message: 'Use a consistent date format (e.g., "Jan 2024 - Present")',
    });
    recommendations.push({
      priority: 'medium',
      message: 'Quantify achievements with metrics (e.g., "improved by 25%")',
    });
  }

  if (score < 75) {
    recommendations.push({
      priority: 'low',
      message: 'Consider adding more specific technical skills',
    });
  }

  return recommendations;
}




/**
 * POST /api/resume/:id/auto-optimize
 * Continuously calls Gemini to improve the resume until ATS >= 90 or max 5 attempts.
 * Body: { targetScore?: number } (default 90)
 */
router.post('/:id/auto-optimize', requireAuth, async (req, res) => {
  if (!mongoReady()) return res.status(503).json({ error: 'Database not ready.' });

  try {
    const userId = req.userId;
    const { id } = req.params;
    const targetScore = req.body.targetScore || 90;
    const MAX_ROUNDS = 5;

    const resume = await Resume.findOne({ _id: id, userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API not configured. Set GEMINI_API_KEY in .env' });
    }

    let currentScore = calculateATSScore(resume.toObject(), resume.targetJD).score;
    const scoreHistory = [currentScore];
    let round = 0;

    while (currentScore < targetScore && round < MAX_ROUNDS) {
      round++;

      // Build a comprehensive optimization prompt
      const jd = resume.targetJD || '';
      const currentSkills = (resume.skills || []).join(', ');
      const atsResult = calculateATSScore(resume.toObject(), jd);
      const missingKw  = (atsResult.details.keywordsMissing || []).slice(0, 10).join(', ');

      const optimizePrompt = `You are an expert ATS resume optimizer. The current resume has an ATS score of ${currentScore}/100 against this job description:

---JOB DESCRIPTION---
${jd || 'General software engineering role'}
---END JD---

Current Resume Skills: ${currentSkills}
Missing Keywords: ${missingKw}

Target: Achieve an ATS score of ${targetScore}+.

Task — Return a valid JSON object with ONLY these keys:
{
  "skills": ["array of skills to ADD to improve keyword match (max 15 new skills, comma separated)"],
  "summaryAddition": "A 2-3 sentence addition to the professional summary that naturally incorporates missing keywords and quantified achievements",
  "optimizedBullets": ["2-3 strong STAR-format bullet points for the most relevant experience, starting with action verbs and containing metrics"]
}

Rules:
- Only suggest real, verifiable skills
- Bullet points must start with strong action verbs (Architected, Engineered, Spearheaded, Optimized, Deployed)
- Include quantified impact (e.g., "reduced latency by 40%", "served 10k concurrent users")
- Ensure all skills and keywords naturally match the JD
- Return ONLY valid JSON, no markdown`;

      const result = await callGeminiJSON(optimizePrompt);

      if (result) {
        // Apply skills
        if (Array.isArray(result.skills)) {
          const newSkills = result.skills.filter(s => s && !resume.skills.includes(s));
          resume.skills.push(...newSkills);
        }

        // Apply summary addition
        if (result.summaryAddition && resume.personal) {
          const currentSummary = resume.personal.summary || '';
          resume.personal.summary = currentSummary
            ? `${currentSummary} ${result.summaryAddition}`
            : result.summaryAddition;
          resume.markModified('personal');
        }

        // Apply optimized bullets to first experience or project
        if (Array.isArray(result.optimizedBullets) && result.optimizedBullets.length) {
          const bulletText = result.optimizedBullets.join('\n');
          if (resume.experiences && resume.experiences.length > 0) {
            // Append to existing achievements
            resume.experiences[0].achievements = [
              ...(resume.experiences[0].achievements || []),
              ...result.optimizedBullets,
            ];
            resume.markModified('experiences');
          } else if (resume.projects && resume.projects.length > 0) {
            resume.projects[0].description = (
              resume.projects[0].description
                ? `${resume.projects[0].description}\n${bulletText}`
                : bulletText
            );
            resume.markModified('projects');
          }
        }

        await resume.save();
      }

      // Recalculate score after this round
      const newAts = calculateATSScore(resume.toObject(), resume.targetJD);
      currentScore = newAts.score;
      scoreHistory.push(currentScore);

      resume.atsScore = currentScore;
      resume.atsKeywords = newAts.details.keywordsFound || [];
      resume.atsMissing  = newAts.details.keywordsMissing || [];
      resume.aiEnhanced  = true;
      await resume.save();

      // Early exit if target reached
      if (currentScore >= targetScore) break;
    }

    return res.json({
      success: true,
      resume,
      finalScore: currentScore,
      targetScore,
      rounds: round,
      scoreHistory,
      achieved: currentScore >= targetScore,
    });
  } catch (err) {
    console.error('[resume/auto-optimize]', err.message);
    return res.status(500).json({ error: 'Auto-optimization failed' });
  }
});

/**
 * GET /api/resume/:id/suggestions
 * Returns AI-powered skill & project suggestions to improve the resume,
 * optionally enriched with AimPlan data.
 */
router.get('/:id/suggestions', requireAuth, async (req, res) => {
  if (!mongoReady()) return res.status(503).json({ error: 'Database not ready.' });

  try {
    const userId = req.userId;
    const { id } = req.params;

    const resume = await Resume.findOne({ _id: id, userId });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Try to get Aim plan for enrichment
    let aimData = null;
    try {
      const aimPlan = await AimPlan.findOne({ userId });
      if (aimPlan?.plan) aimData = aimPlan.plan;
    } catch { /* silent */ }

    const currentSkills = (resume.skills || []).join(', ');
    const targetRole    = resume.targetRole || aimData?.target?.role || 'Software Engineer';
    const targetCompany = resume.targetCompany || aimData?.target?.company || '';
    const targetJD      = resume.targetJD || '';
    const atsResult     = calculateATSScore(resume.toObject(), targetJD);
    const missingKw     = (atsResult.details.keywordsMissing || []).slice(0, 10).join(', ');

    // Aim proofOfWork projects as context
    const aimProjects = (aimData?.proofOfWork || aimData?.resumeProjects || []).slice(0, 3);
    const aimProjectsText = aimProjects.length
      ? aimProjects.map(p => `- ${p.title}: ${p.why || p.description || ''}`).join('\n')
      : '';

    if (!GEMINI_API_KEY) {
      // Return a basic static fallback
      return res.json({
        skillsToLearn: [
          { skill: 'Docker', reason: 'Container knowledge is expected at most tech companies', priority: 'high' },
          { skill: 'TypeScript', reason: 'Strongly typed JavaScript improves code quality', priority: 'high' },
          { skill: 'System Design', reason: 'Critical for senior-level interviews', priority: 'medium' },
        ],
        projectsToMake: [
          { title: 'Full-Stack SaaS App', description: 'Build and deploy a SaaS with auth, billing, and a core feature', stack: ['React', 'Node.js', 'MongoDB'], atsImpact: 'high' },
          { title: 'Open Source Contribution', description: 'Get a merged PR in a popular library to build credibility', stack: ['Any'], atsImpact: 'high' },
        ],
        fromAim: false,
      });
    }

    const prompt = `You are a senior tech career coach. Analyze this candidate's resume and provide specific, actionable suggestions to make it significantly better.

Candidate Info:
- Target Role: ${targetRole}${targetCompany ? ' at ' + targetCompany : ''}
- Current Skills: ${currentSkills || 'Not specified'}
- ATS Score: ${atsResult.score}/100
- Missing JD Keywords: ${missingKw || 'N/A'}
${aimProjectsText ? `\nAim Page Suggested Projects:\n${aimProjectsText}` : ''}

Return ONLY a valid JSON object (no markdown) with this exact structure:
{
  "skillsToLearn": [
    {
      "skill": "skill name",
      "reason": "1-2 sentence explanation of why this skill helps for the target role",
      "priority": "high" | "medium" | "low",
      "timeToLearn": "e.g., 2 weeks",
      "resource": "a specific, free learning resource URL or name"
    }
  ],
  "projectsToMake": [
    {
      "title": "Project name",
      "description": "What to build and why it stands out to recruiters",
      "stack": ["tech1", "tech2"],
      "atsImpact": "high" | "medium" | "low",
      "estimatedHours": 20,
      "resumeBullet": "A ready-to-use resume bullet point starting with an action verb and metric"
    }
  ],
  "summaryTips": ["specific tip to improve the resume summary section"],
  "overallScore": ${atsResult.score},
  "potentialScore": a realistic ATS score if suggestions are followed (int, max 98)
}

Rules:
- Return exactly 5 skillsToLearn and 4 projectsToMake
- Skills must be specific (not "JavaScript" if they already have it)
- Projects must be realistic for the target role and directly improve ATS score
- Each project must have a concrete "resumeBullet" with a quantified metric
- Resources should be real (e.g., "roadmap.sh", "docs.docker.com", "missing-semester.csail.mit.edu")`;

    const result = await callGeminiJSON(prompt);

    if (!result) {
      return res.json({
        skillsToLearn: [],
        projectsToMake: [],
        summaryTips: [],
        overallScore: atsResult.score,
        potentialScore: Math.min(atsResult.score + 20, 98),
        fromAim: !!aimData,
        error: 'AI suggestions unavailable',
      });
    }

    return res.json({
      ...result,
      fromAim: !!aimData,
      aimProjectSuggestions: aimProjects,
    });
  } catch (err) {
    console.error('[resume/suggestions]', err.message);
    return res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

/**
 * DELETE /api/resume/:id
 * Deletes a specific resume
 */
router.delete('/:id', requireAuth, async (req, res) => {
  if (!mongoReady()) {
    return res.status(503).json({ error: 'Database is currently unavailable.' });
  }

  try {
    const userId = req.userId;
    const resumeId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ error: 'Invalid resume ID' });
    }
    
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    const resume = await Resume.findOneAndDelete({ _id: resumeId, userId: userObjectId });
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found or unauthorized' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[resume/delete]', err.message);
    return res.status(500).json({ error: 'Failed to delete resume' });
  }
});

module.exports = router;
