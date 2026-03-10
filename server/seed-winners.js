/**
 * server/seed-winners.js  –  Generate past hackathon winners via Gemini AI
 *
 * Run:  node seed-winners.js
 *
 * Calls the Gemini API to brainstorm realistic past winner showcases,
 * then saves them to MongoDB (if connected) and data/winners-cache.json.
 *
 * Option C (Hybrid): AI-generated, stored for admin review (approved=true by default).
 */

'use strict';

require('dotenv').config();

const fs       = require('fs');
const path     = require('path');
const fetch    = require('node-fetch');
const mongoose = require('mongoose');

const GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const CACHE_FILE  = path.join(__dirname, 'data', 'winners-cache.json');

/* ───────────────────────────────────────────────────────────
   GEMINI HELPER
   ─────────────────────────────────────────────────────────── */
async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.error('❌ GEMINI_API_KEY not set in .env'); return null; }
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[seed] Gemini HTTP', res.status, errText.slice(0, 300));
      return null;
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } catch (e) {
    console.error('[seed] Gemini error:', e.message);
    return null;
  }
}

/* ───────────────────────────────────────────────────────────
   PROMPT
   ─────────────────────────────────────────────────────────── */
const PROMPT = `You are a hackathon data generator. Generate 18 realistic past hackathon winning projects.
The projects should be diverse across these categories: ai, web3, hardware, climate, data, general.

For each project, produce a JSON object with EXACTLY these fields:
- hackathonName: string (real-sounding hackathon name e.g. "ETHGlobal 2025", "TreeHacks 2024", "HackMIT 2025")
- projectName: string (creative project name)
- teamName: string (creative team name)
- teamMembers: array of 2-4 first names
- placement: string (one of: "1st Place", "2nd Place", "3rd Place", "Best AI Track", "Best Use of API", "Most Innovative", "Best Social Impact", "Runner Up")
- prize: string (e.g. "$10,000", "$5,000", "$2,500")
- description: string (2-3 sentences describing what the project does and why it won)
- techStack: array of 3-6 technologies (e.g. ["React", "Python", "OpenAI", "MongoDB"])
- projectUrl: string (use "#" as placeholder)
- year: number (2024 or 2025)
- category: string (one of: "ai", "web3", "hardware", "climate", "data", "general")

Return ONLY a JSON array of 18 objects, no markdown fences, no extra text.
Make the projects inspiring, technically impressive, and varied — the kind of work that motivates students to participate in hackathons.
Include a mix of 1st/2nd/3rd places plus special track awards.`;

/* ───────────────────────────────────────────────────────────
   FALLBACK DATA (if Gemini is unavailable)
   ─────────────────────────────────────────────────────────── */
const FALLBACK_WINNERS = [
  { hackathonName: 'ETHGlobal 2025', projectName: 'DeFi Autopilot', teamName: 'Chain Chasers', teamMembers: ['Alice', 'Bob', 'Chen'], placement: '1st Place', prize: '$10,000', description: 'An AI-powered DeFi portfolio manager that auto-rebalances across L2 chains using intent-based transactions. Won for its seamless UX and gas optimization engine.', techStack: ['Solidity', 'React', 'Python', 'The Graph', 'Chainlink'], projectUrl: '#', year: 2025, category: 'web3' },
  { hackathonName: 'TreeHacks 2025', projectName: 'EcoLens', teamName: 'Green Bytes', teamMembers: ['Priya', 'Jordan', 'Sam'], placement: '1st Place', prize: '$5,000', description: 'A mobile app that uses computer vision to identify plant species and track local biodiversity. Built a crowdsourced biodiversity map for urban areas.', techStack: ['React Native', 'TensorFlow Lite', 'Firebase', 'MapboxGL'], projectUrl: '#', year: 2025, category: 'climate' },
  { hackathonName: 'HackMIT 2024', projectName: 'NeuroNote', teamName: 'Synapse Squad', teamMembers: ['Maya', 'Liam', 'Ava', 'Derek'], placement: 'Best AI Track', prize: '$3,000', description: 'An AI study assistant that generates flashcards, mind maps, and practice quizzes from lecture recordings using Whisper + GPT-4. Judges loved the real-time concept linking.', techStack: ['Next.js', 'OpenAI', 'Whisper', 'PostgreSQL', 'D3.js'], projectUrl: '#', year: 2024, category: 'ai' },
  { hackathonName: 'Cal Hacks 2024', projectName: 'CodeReview AI', teamName: 'Lint Lords', teamMembers: ['Ravi', 'Emma', 'Kai'], placement: '2nd Place', prize: '$4,000', description: 'A GitHub App that provides senior-engineer-level code reviews using LLM agents. Each PR gets architecture feedback, security audit, and performance tips.', techStack: ['TypeScript', 'Node.js', 'OpenAI', 'GitHub API', 'Redis'], projectUrl: '#', year: 2024, category: 'ai' },
  { hackathonName: 'PennApps 2025', projectName: 'MedBridge', teamName: 'HealthHack', teamMembers: ['Sofia', 'Ahmed', 'Lin'], placement: 'Best Social Impact', prize: '$2,500', description: 'A telemedicine platform connecting rural patients with volunteer doctors. Features real-time translation in 12 languages and offline-first architecture.', techStack: ['React', 'WebRTC', 'Node.js', 'MongoDB', 'Google Translate API'], projectUrl: '#', year: 2025, category: 'general' },
  { hackathonName: 'HackTheNorth 2024', projectName: 'DataForge', teamName: 'Query Kings', teamMembers: ['Nadia', 'Tyler', 'Jess', 'Marcus'], placement: '3rd Place', prize: '$2,000', description: 'A no-code data pipeline builder that lets non-engineers create ETL workflows with drag-and-drop. Exports to CSV, dashboards, or directly to a data warehouse.', techStack: ['React Flow', 'Python', 'FastAPI', 'DuckDB', 'Tailwind'], projectUrl: '#', year: 2024, category: 'data' },
  { hackathonName: 'LAHacks 2025', projectName: 'WaveSync', teamName: 'Signal Crew', teamMembers: ['Olivia', 'Ryan', 'Tanvi'], placement: 'Most Innovative', prize: '$3,500', description: 'An IoT device using ultrasonic sensors to detect water leaks in real-time. The companion app maps leak locations and estimates water waste. Won for hardware-software integration.', techStack: ['Arduino', 'C++', 'React Native', 'MQTT', 'InfluxDB'], projectUrl: '#', year: 2025, category: 'hardware' },
  { hackathonName: 'Devpost AI Hackathon 2024', projectName: 'Promptopia', teamName: 'Token Tamers', teamMembers: ['Zara', 'Leo', 'Chris'], placement: '1st Place', prize: '$8,000', description: 'A marketplace and playground for sharing, testing, and versioning AI prompts. Features A/B testing, cost tracking, and collaborative prompt engineering.', techStack: ['Next.js', 'OpenAI', 'Supabase', 'Stripe', 'Vercel'], projectUrl: '#', year: 2024, category: 'ai' },
  { hackathonName: 'SheHacks 2025', projectName: 'SafeWalk', teamName: 'Pathfinders', teamMembers: ['Ananya', 'Grace', 'Mia'], placement: '1st Place', prize: '$3,000', description: 'A safety-first navigation app that routes users through well-lit, high-traffic areas at night. Integrates real-time crime data and community safety reports.', techStack: ['Flutter', 'Google Maps API', 'Firebase', 'Python', 'scikit-learn'], projectUrl: '#', year: 2025, category: 'general' },
  { hackathonName: 'ETHDenver 2025', projectName: 'DAOVote', teamName: 'Governance Gang', teamMembers: ['Marcus', 'Lily', 'Jake'], placement: 'Best Use of API', prize: '$5,000', description: 'A gasless, privacy-preserving voting system for DAOs using zero-knowledge proofs. Members vote without revealing their identity while maintaining on-chain verifiability.', techStack: ['Solidity', 'Circom', 'React', 'IPFS', 'Alchemy'], projectUrl: '#', year: 2025, category: 'web3' },
  { hackathonName: 'NASA SpaceApps 2024', projectName: 'AstroTrack', teamName: 'Orbit Ops', teamMembers: ['Kai', 'Elena', 'Rohan', 'Tina'], placement: '1st Place', prize: '$7,500', description: 'A satellite debris tracking dashboard that predicts collision probabilities using NASA open data. Features 3D orbit visualization and automated alert system.', techStack: ['Three.js', 'Python', 'TLE.js', 'FastAPI', 'PostgreSQL'], projectUrl: '#', year: 2024, category: 'data' },
  { hackathonName: 'Hack the Planet 2025', projectName: 'CarbonTrail', teamName: 'Net Zero', teamMembers: ['Isla', 'Noah', 'Dev'], placement: '1st Place', prize: '$6,000', description: 'A browser extension that calculates the carbon footprint of your online shopping and suggests eco-friendly alternatives. Partners with offset programs for one-click carbon neutralization.', techStack: ['Chrome Extension API', 'React', 'Node.js', 'OpenAI', 'Stripe'], projectUrl: '#', year: 2025, category: 'climate' },
  { hackathonName: 'HackRice 2024', projectName: 'StudySync', teamName: 'Brainwave', teamMembers: ['Aiden', 'Sakura', 'Omar'], placement: '2nd Place', prize: '$2,500', description: 'A collaborative study platform with real-time document editing, integrated Pomodoro timer, and AI-generated study guides from shared notes.', techStack: ['React', 'Socket.io', 'Express', 'MongoDB', 'OpenAI'], projectUrl: '#', year: 2024, category: 'general' },
  { hackathonName: 'Junction 2025', projectName: 'SpectraVision', teamName: 'Pixel Pioneers', teamMembers: ['Felix', 'Amara', 'Wei'], placement: 'Most Innovative', prize: '$4,000', description: 'A wearable device with a companion app that helps colorblind users identify colors in real-time using AR overlays and haptic feedback patterns.', techStack: ['Swift', 'ARKit', 'CoreML', 'BLE', 'Raspberry Pi'], projectUrl: '#', year: 2025, category: 'hardware' },
  { hackathonName: 'Buildspace S5 2024', projectName: 'ShipFast AI', teamName: 'Velocity', teamMembers: ['Zoe', 'Arjun', 'Chloe', 'Ben'], placement: 'Best AI Track', prize: '$5,000', description: 'An AI coding agent that turns Figma designs into production-ready React components with proper accessibility, responsive layouts, and unit tests.', techStack: ['TypeScript', 'OpenAI', 'Figma API', 'React', 'Playwright'], projectUrl: '#', year: 2024, category: 'ai' },
  { hackathonName: 'DeFi Hackathon 2025', projectName: 'YieldGuard', teamName: 'Vault Vipers', teamMembers: ['Tariq', 'Nina', 'Alex'], placement: '3rd Place', prize: '$3,000', description: 'An on-chain insurance protocol that protects DeFi yield farmers against smart contract exploits. Uses historical audit data to price risk dynamically.', techStack: ['Solidity', 'Hardhat', 'React', 'TheGraph', 'Chainlink Functions'], projectUrl: '#', year: 2025, category: 'web3' },
  { hackathonName: 'Climate Hack 2024', projectName: 'GridSense', teamName: 'Watt Wizards', teamMembers: ['Leah', 'Mateo', 'Iris'], placement: '1st Place', prize: '$8,000', description: 'A machine learning model that predicts renewable energy grid demand 48 hours ahead with 94% accuracy. Helps utilities balance solar/wind supply and reduce fossil fuel backup.', techStack: ['Python', 'PyTorch', 'Streamlit', 'AWS SageMaker', 'PostgreSQL'], projectUrl: '#', year: 2024, category: 'climate' },
  { hackathonName: 'MLH Global Hack 2025', projectName: 'QueryBot', teamName: 'Data Dynamos', teamMembers: ['Ethan', 'Fatima', 'Lucas'], placement: 'Runner Up', prize: '$2,000', description: 'A natural language SQL interface that lets non-technical users query databases by asking questions in plain English. Features query explanation and result visualization.', techStack: ['Python', 'LangChain', 'Streamlit', 'SQLite', 'OpenAI'], projectUrl: '#', year: 2025, category: 'data' },
];

/* ───────────────────────────────────────────────────────────
   MAIN
   ─────────────────────────────────────────────────────────── */
async function main() {
  console.log('\n🏆 Nexus — Past Winners Seed Script\n');

  let winners = [];

  // ── Try Gemini first ─────────────────────────────────────
  console.log('🤖 Calling Gemini to generate past winner ideas...');
  const raw = await callGemini(PROMPT);

  if (raw) {
    try {
      // strip markdown fences if present
      const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      winners = JSON.parse(clean);
      console.log(`✅ Gemini returned ${winners.length} winners`);
    } catch (e) {
      console.warn('⚠️  Gemini returned invalid JSON, using fallback data.');
      console.warn('   Parse error:', e.message);
      winners = FALLBACK_WINNERS;
    }
  } else {
    console.log('⚠️  Gemini unavailable, using fallback data.');
    winners = FALLBACK_WINNERS;
  }

  // ── Normalize + add uids ──────────────────────────────────
  winners = winners.map((w, i) => ({
    uid:            `winner-${(w.hackathonName || 'hack').replace(/\s+/g, '-').toLowerCase()}-${i}`,
    hackathonName:  w.hackathonName || 'Unknown Hackathon',
    projectName:    w.projectName   || 'Untitled Project',
    teamName:       w.teamName      || 'Anonymous',
    teamMembers:    w.teamMembers   || [],
    placement:      w.placement     || '1st Place',
    prize:          w.prize         || null,
    description:    w.description   || '',
    techStack:      w.techStack     || [],
    projectUrl:     w.projectUrl    || '#',
    imageUrl:       null,
    year:           w.year          || 2024,
    category:       w.category      || 'general',
    approved:       true,
    source:         raw ? 'gemini' : 'fallback',
  }));

  // ── Save to JSON cache ────────────────────────────────────
  try {
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ generatedAt: new Date().toISOString(), winners }, null, 2),
      'utf8'
    );
    console.log(`💾 Saved ${winners.length} winners to ${CACHE_FILE}`);
  } catch (e) {
    console.error('❌ Failed to write cache file:', e.message);
  }

  // ── Save to MongoDB (if available) ─────────────────────────
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      console.log('🔗 Connecting to MongoDB...');
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB connected');

      const PastWinner = require('./models/PastWinner');
      const ops = winners.map(w => ({
        updateOne: {
          filter: { uid: w.uid },
          update: { $set: w },
          upsert: true,
        },
      }));
      const result = await PastWinner.bulkWrite(ops, { ordered: false });
      console.log(`🗃️  MongoDB: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);

      await mongoose.disconnect();
    } catch (e) {
      console.error('⚠️  MongoDB save failed:', e.message);
    }
  } else {
    console.log('ℹ️  No MONGODB_URI — skipped database save');
  }

  console.log('\n✅ Done! Winners are ready to serve.\n');
}

main().catch(console.error);
