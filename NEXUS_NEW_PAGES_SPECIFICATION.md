# Nexus Platform: Experience & Aim Pages
## Complete UI/UX & Backend Architecture Specification

---

## Table of Contents
1. [Experience Page (Interview & Placement Insights)](#experience-page)
2. [Aim Page (AI Career Roadmap & Target Tracker)](#aim-page)
3. [Global Technical Stack](#technical-stack)
4. [3D Parallax Implementation Strategy](#parallax-implementation)

---

# Experience Page (Interview & Placement Insights) {#experience-page}

## 🎨 UI/UX Layout - What Users See

### Hero Section (with 3D Parallax)
**Visual Hierarchy:**
```
┌─────────────────────────────────────────────────────┐
│  Background Layer (slowest): Gradient mesh          │
│    Mid Layer (medium): Floating card patterns      │
│      Foreground Layer (fast): Content               │
│                                                     │
│   🎯 REAL STORIES, REAL OFFERS                      │
│   Discover How 10,000+ Students                    │
│   Cracked Their Dream Placements                   │
│                                                     │
│  [🔍 Search: Company, Role, Tech Stack...]         │
│                                                     │
│  Quick Filters:                                     │
│  [FAANG] [Product-Based] [Service] [Remote]        │
│                                                     │
│  Verified: 2,847 ✓ | Fresh This Week: 142         │
└─────────────────────────────────────────────────────┘
```

**3D Parallax Behavior:**
- Background gradient moves at 0.3x scroll speed
- Floating card patterns move at 0.5x scroll speed
- Hero content moves at 1x scroll speed (normal)
- Creates depth perception as user scrolls down

---

### Experience Feed (Main Content Area)

**Card Layout Structure:**
Each experience card has a 3D lift effect on hover with shadow depth.

```
┌─────────────────────────────────────────────────────┐
│ 🏢 Google | Software Engineer Intern                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 👤 Rohan Mehta • Posted 3 days ago • ✓ Verified   │
│                                                     │
│ 📊 Quick Stats:                                     │
│ • 5 Rounds | 45 Days | ⭐ 4.2/5 Difficulty         │
│ • Offer: ₹18 LPA (Accepted)                        │
│                                                     │
│ 🛠️ Tech Stack Tested:                              │
│ [React] [Node.js] [PostgreSQL] [AWS] [Docker]     │
│                                                     │
│ 📝 Prep Time: 4 months                             │
│ Strategy: Focused on LeetCode medium/hard + ...   │
│                                                     │
│ [Read Full Experience →]                           │
└─────────────────────────────────────────────────────┘
```

**Filter Sidebar (Left - Fixed Position):**
```
┌────────────────┐
│ 🔍 FILTERS     │
├────────────────┤
│ Companies ▼    │
│ □ FAANG        │
│ □ Startups     │
│ □ MNCs         │
│                │
│ Roles ▼        │
│ □ SDE          │
│ □ Data Sci.    │
│ □ DevOps       │
│                │
│ Status ▼       │
│ ☑ Verified     │
│ □ Offers Only  │
│                │
│ Difficulty ▼   │
│ □ Easy (1-2)   │
│ ☑ Medium (3)   │
│ □ Hard (4-5)   │
└────────────────┘
```

---

### Detailed Experience View (Modal/Full Page)

When user clicks "Read Full Experience", they see an immersive timeline with 3D parallax:

```
┌─────────────────────────────────────────────────────┐
│ ← Back to Feed                                      │
│                                                     │
│ Google Software Engineer Intern                    │
│ Interview Experience by Rohan Mehta ✓              │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 📋 METADATA                                         │
│ Applied: Jan 15, 2026                              │
│ First Round: Jan 28, 2026                          │
│ Offer Date: Mar 5, 2026                            │
│ Total Duration: 45 Days                            │
│ Difficulty Rating: 4.2/5 (168 votes)               │
│                                                     │
│ 💼 PROFILE MATCH                                    │
│ [View Rohan's Experience Radar →]                  │
│ Skills: React (Expert), DSA (Advanced), System...  │
│                                                     │
└─────────────────────────────────────────────────────┘

        ↓ (Scroll down with 3D parallax effect)

┌─────────────────────────────────────────────────────┐
│                                                     │
│          🎯 INTERVIEW TIMELINE                      │
│                                                     │
│                    ↓                                │
│              ╭─────────╮                            │
│              │ ROUND 1 │ ← Background layer moves  │
│              ╰─────────╯    slower than this card  │
│         Online Assessment                           │
│         Jan 28, 2026                               │
│                                                     │
│         Duration: 90 minutes                        │
│         Platform: HackerRank                        │
│                                                     │
│         Questions:                                  │
│         1. Longest Substring Without Repeating      │
│            Characters (Medium)                      │
│            ├─ My Approach: Sliding window + HashMap│
│            └─ Time: O(n) | Space: O(min(m,n))      │
│                                                     │
│         2. Design a Rate Limiter (Hard)            │
│            ├─ Used Token Bucket Algorithm           │
│            └─ Implemented with Redis-like logic    │
│                                                     │
│         ✅ Result: PASSED (Top 15%)                 │
│                    ↓                                │
│              ╭─────────╮                            │
│              │ ROUND 2 │                            │
│              ╰─────────╯                            │
│           Technical Phone Screen                    │
│           Feb 8, 2026                              │
│                                                     │
│         Duration: 60 minutes                        │
│         Interviewer: L5 Engineer                    │
│                                                     │
│         Deep Dive Topics:                           │
│         • React Hooks lifecycle & optimization      │
│         • Difference between useMemo vs useCallback │
│         • Debouncing vs Throttling implementation   │
│         • CSS specificity & BEM methodology         │
│                                                     │
│         Live Coding:                                │
│         Build a real-time search autocomplete       │
│         with API debouncing                         │
│                                                     │
│         ✅ Result: STRONG HIRE                       │
│                    ↓                                │
│              ╭─────────╮                            │
│              │ ROUND 3 │                            │
│              ╰─────────╯                            │
│         System Design (Virtual)                     │
│         Feb 18, 2026                               │
│                                                     │
│         Duration: 75 minutes                        │
│         Problem: Design YouTube's Video Upload      │
│         and Streaming Service                       │
│                                                     │
│         Key Points Discussed:                       │
│         • CDN strategy for global distribution      │
│         • Transcoding pipeline (FFmpeg)             │
│         • Database sharding for video metadata      │
│         • Handling concurrent uploads               │
│                                                     │
│         My Architecture:                            │
│         [View Whiteboard Diagram →]                │
│                                                     │
│         ✅ Result: HIRE (with minor gaps noted)     │
│                    ↓                                │
│              ╭─────────╮                            │
│              │ ROUND 4 │                            │
│              ╰─────────╯                            │
│         Behavioral + Culture Fit                    │
│         Feb 25, 2026                               │
│                                                     │
│         Duration: 45 minutes                        │
│         Interviewer: Hiring Manager                 │
│                                                     │
│         Questions Asked:                            │
│         • Tell me about a time you faced conflict   │
│         • How do you handle tight deadlines?        │
│         • Why Google?                               │
│                                                     │
│         ✅ Result: STRONG HIRE                       │
│                    ↓                                │
│              ╭─────────╮                            │
│              │ ROUND 5 │                            │
│              ╰─────────╯                            │
│         Final Discussion with Team Lead             │
│         Mar 2, 2026                                │
│                                                     │
│         Duration: 30 minutes                        │
│         Topics: Team structure, project scope       │
│                                                     │
│         ✅ Result: Team match confirmed             │
│                    ↓                                │
│                   🎉                                │
│         ╭─────────────────────╮                     │
│         │   OFFER RECEIVED    │                     │
│         ╰─────────────────────╯                     │
│         Mar 5, 2026                                │
│                                                     │
│         Package: ₹18,00,000 per annum              │
│         Location: Bangalore                         │
│         Team: YouTube Frontend                     │
│         Status: ACCEPTED ✓                         │
│                                                     │
└─────────────────────────────────────────────────────┘

        ↓ (Continue scrolling)

┌─────────────────────────────────────────────────────┐
│                                                     │
│ 📚 MY PREPARATION STRATEGY                          │
│                                                     │
│ Resources Used:                                     │
│ • LeetCode: 450+ problems (focus: graphs, trees)   │
│ • System Design Primer (GitHub)                    │
│ • "Designing Data-Intensive Applications" book     │
│ • Mock interviews: 12 sessions on Pramp           │
│                                                     │
│ Timeline Breakdown:                                 │
│ Months 1-2: DSA foundations (200 problems)         │
│ Month 3: System design + projects                  │
│ Month 4: Mock interviews + revision                │
│                                                     │
│ Projects That Helped:                               │
│ [Link to Experience Radar] →                       │
│ • Built scalable chat app with Socket.io           │
│ • Optimized React app from 6s to 1.2s load time   │
│                                                     │
│ Top Tips:                                           │
│ 1. Don't just solve problems—understand patterns   │
│ 2. Practice explaining solutions out loud          │
│ 3. System design: Start broad, then dive deep      │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 💬 COMMUNITY DISCUSSION (42 comments)               │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 👤 Priya K. · 2 days ago                           │
│ Thanks for sharing! The system design section      │
│ was super helpful. Did they ask about...           │
│ [Reply] [👍 24]                                     │
│                                                     │
│   ↪ Rohan Mehta (Author) · 1 day ago ✓            │
│     Yes! They specifically asked about how to...   │
│     [👍 18]                                         │
│                                                     │
│ 👤 Arjun S. · 1 day ago                            │
│ What was your LeetCode rating before applying?     │
│ [Reply] [👍 15]                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**3D Parallax on Timeline:**
- Background gradient moves at 0.2x speed
- Interview round cards move at 0.6x speed
- Text content moves at 1x speed
- Creates a "stepping deeper into the process" feel

---

### Submit New Experience (Form Page)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Share Your Interview Experience                  │
│   Help thousands of students like you              │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ STEP 1: BASIC INFORMATION                           │
│                                                     │
│ Company Name *                                      │
│ [________________] ← Autocomplete dropdown         │
│                                                     │
│ Role Applied For *                                  │
│ [________________]                                  │
│                                                     │
│ Application Date *                                  │
│ [📅 Select Date]                                    │
│                                                     │
│ Final Status *                                      │
│ ( ) Offer Accepted                                  │
│ ( ) Offer Rejected                                  │
│ ( ) Rejected in Process                             │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ STEP 2: INTERVIEW ROUNDS                            │
│                                                     │
│ How many rounds?                                    │
│ [+] Add Round                                       │
│                                                     │
│ ┌─ Round 1: Online Assessment ──────────────┐     │
│ │ Date: [📅]                                  │     │
│ │ Duration: [90] minutes                      │     │
│ │ Platform: [HackerRank ▼]                   │     │
│ │                                             │     │
│ │ Questions/Topics:                           │     │
│ │ [Rich text editor with code blocks...]     │     │
│ │                                             │     │
│ │ Result: [Passed ▼]                         │     │
│ │ [🗑️ Remove Round]                           │     │
│ └─────────────────────────────────────────────┘     │
│                                                     │
│ [+] Add Another Round                               │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ STEP 3: TECH STACK TESTED                           │
│                                                     │
│ Select all technologies you were tested on:        │
│ [JavaScript] [React] [Node.js] [+Add Custom]      │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ STEP 4: PREPARATION STRATEGY                        │
│                                                     │
│ Preparation Duration: [4] months                   │
│                                                     │
│ Describe your preparation approach:                │
│ [Rich text editor...]                              │
│                                                     │
│ Resources Used:                                     │
│ [+ Add Resource Link]                              │
│                                                     │
│ Link Your Experience Radar Profile (Optional):     │
│ This helps others see your project background      │
│ [@username] ← Links to your profile                │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ STEP 5: VERIFICATION (Optional but Recommended)    │
│                                                     │
│ 🔐 Get your experience verified for a badge!       │
│                                                     │
│ [ ] Upload offer letter (PDF, redacted)            │
│     [📎 Choose File]                                │
│                                                     │
│ [ ] Link LinkedIn post about this placement        │
│     [________________]                              │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ Difficulty Rating (1-5 stars)                      │
│ ⭐⭐⭐⭐☆                                             │
│                                                     │
│ [Cancel]              [Save as Draft] [📤 Publish] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🏗️ Backend Architecture - Experience Page

### Database Schema (MongoDB/PostgreSQL)

```javascript
// Experience Collection/Table
{
  _id: ObjectId,
  author: {
    userId: ObjectId,              // Reference to User collection
    username: String,
    experienceRadarProfile: String // Link to their radar profile
  },
  
  company: {
    name: String,                  // "Google", "Microsoft", etc.
    companyId: ObjectId,           // Reference to Companies collection
    logo: String                   // URL to company logo
  },
  
  role: {
    title: String,                 // "Software Engineer Intern"
    level: String,                 // "Intern", "Junior", "Mid", "Senior"
    type: String                   // "Full-time", "Intern", "Contract"
  },
  
  timeline: {
    applicationDate: Date,         // When they applied
    firstRoundDate: Date,
    finalDecisionDate: Date,
    totalDurationDays: Number      // Calculated
  },
  
  rounds: [
    {
      roundNumber: Number,         // 1, 2, 3...
      roundType: String,           // "Online Assessment", "Technical", "HR"
      date: Date,
      duration: Number,            // in minutes
      platform: String,            // "HackerRank", "CoderPad", "Zoom"
      
      content: {
        description: String,       // Rich text/markdown
        questions: [
          {
            question: String,
            approach: String,
            difficulty: String,    // "Easy", "Medium", "Hard"
            leetcodeLink: String   // Optional
          }
        ],
        topics: [String]           // ["React Hooks", "System Design"]
      },
      
      result: String,              // "Passed", "Failed", "Strong Hire"
      feedbackNotes: String        // Optional feedback received
    }
  ],
  
  techStack: [
    {
      technology: String,          // "React", "Node.js"
      proficiencyTested: String    // "Basic", "Intermediate", "Advanced"
    }
  ],
  
  preparation: {
    durationMonths: Number,
    strategy: String,              // Rich text/markdown
    resources: [
      {
        name: String,
        url: String,
        type: String               // "Course", "Book", "Platform"
      }
    ]
  },
  
  outcome: {
    status: String,                // "Offer Accepted", "Offer Rejected", "Rejected"
    packageCTC: Number,            // in LPA (if applicable)
    location: String,
    joinedDate: Date               // (if accepted)
  },
  
  verification: {
    isVerified: Boolean,           // Has badge or not
    verificationMethod: String,    // "Offer Letter", "LinkedIn", "Manual"
    verifiedDate: Date,
    documentUrl: String            // Internal secure URL (if uploaded)
  },
  
  difficultyRating: Number,        // 1-5 (average from community votes)
  difficultyVotes: Number,         // Total votes received
  
  engagement: {
    views: Number,
    upvotes: Number,
    bookmarks: Number,
    comments: Number
  },
  
  metadata: {
    createdAt: Date,
    updatedAt: Date,
    status: String,                // "draft", "published", "flagged"
    tags: [String],                // Auto-generated and manual
    featured: Boolean              // Highlighted experiences
  }
}

// Comments Collection
{
  _id: ObjectId,
  experienceId: ObjectId,          // Reference to Experience
  userId: ObjectId,
  username: String,
  content: String,
  parentCommentId: ObjectId,       // For nested replies
  upvotes: Number,
  createdAt: Date
}

// Companies Collection (Master Data)
{
  _id: ObjectId,
  name: String,
  logo: String,
  industry: String,
  type: String,                    // "FAANG", "Startup", "MNC", "Service"
  website: String,
  totalExperiences: Number         // Cached count
}
```

---

### API Endpoints - Experience Page

#### 1. **GET** `/api/experiences` (Fetch Experience Feed)

**Query Parameters:**
```javascript
{
  page: Number,                    // Pagination
  limit: Number,                   // Results per page (default: 20)
  company: String,                 // Filter by company name
  role: String,                    // Filter by role
  techStack: [String],             // Filter by technologies
  verified: Boolean,               // Show only verified
  difficulty: String,              // "1-2", "3", "4-5"
  sortBy: String,                  // "recent", "popular", "rating"
  search: String                   // Full-text search
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    experiences: [
      {
        _id: "...",
        company: { name: "Google", logo: "..." },
        role: { title: "SDE Intern" },
        author: { username: "rohan_m", experienceRadarProfile: "/radar/rohan_m" },
        timeline: { totalDurationDays: 45 },
        rounds: [{ roundType: "...", ... }],
        techStack: ["React", "Node.js"],
        outcome: { status: "Offer Accepted", packageCTC: 18 },
        verification: { isVerified: true },
        difficultyRating: 4.2,
        engagement: { views: 1240, upvotes: 89 }
      }
      // ... more experiences
    ],
    pagination: {
      currentPage: 1,
      totalPages: 45,
      totalResults: 897
    },
    filters: {
      appliedFilters: { company: "Google", verified: true }
    }
  }
}
```

---

#### 2. **GET** `/api/experiences/:id` (Fetch Single Experience)

**Response:**
```javascript
{
  success: true,
  data: {
    experience: {
      // Full experience object with all rounds, comments, etc.
    },
    relatedExperiences: [
      // Similar experiences (same company/role)
    ]
  }
}
```

---

#### 3. **POST** `/api/experiences` (Submit New Experience)

**Request Body:**
```javascript
{
  company: {
    name: "Google",
    // Auto-matched to Companies collection
  },
  role: {
    title: "Software Engineer Intern",
    level: "Intern"
  },
  timeline: {
    applicationDate: "2026-01-15",
    firstRoundDate: "2026-01-28",
    finalDecisionDate: "2026-03-05"
  },
  rounds: [
    {
      roundNumber: 1,
      roundType: "Online Assessment",
      date: "2026-01-28",
      duration: 90,
      content: {
        description: "Two coding problems...",
        questions: [
          {
            question: "Longest Substring Without Repeating Characters",
            approach: "Used sliding window...",
            difficulty: "Medium"
          }
        ]
      },
      result: "Passed"
    }
    // ... more rounds
  ],
  techStack: ["React", "Node.js", "PostgreSQL"],
  preparation: {
    durationMonths: 4,
    strategy: "Focused on LeetCode and system design...",
    resources: [
      { name: "LeetCode", url: "leetcode.com", type: "Platform" }
    ]
  },
  outcome: {
    status: "Offer Accepted",
    packageCTC: 18,
    location: "Bangalore"
  },
  verification: {
    offerLetterFile: File,         // Multipart upload
    linkedInPostUrl: "linkedin.com/posts/..."
  },
  difficultyRating: 4
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    experienceId: "...",
    message: "Experience submitted successfully!",
    verificationStatus: "pending"  // Will be reviewed for badge
  }
}
```

---

#### 4. **POST** `/api/experiences/:id/verify` (Admin/Automated Verification)

**Internal endpoint for verification process**

**Logic:**
1. If offer letter uploaded → OCR scan for company name, role, date
2. If LinkedIn post → Scrape post content, verify company tag
3. Manual review by admin if ambiguous
4. Update `verification.isVerified = true` and add badge

---

#### 5. **POST** `/api/experiences/:id/comments` (Add Comment)

**Request Body:**
```javascript
{
  content: "Thanks for sharing! This was really helpful...",
  parentCommentId: "..."           // Optional for replies
}
```

---

#### 6. **GET** `/api/companies/autocomplete` (For Search/Filter)

**Query Parameters:**
```javascript
{
  query: String                    // Partial company name
}
```

**Response:**
```javascript
{
  success: true,
  data: [
    { name: "Google", logo: "...", experienceCount: 342 },
    { name: "Goldman Sachs", logo: "...", experienceCount: 189 }
  ]
}
```

---

### Backend Services & Logic

#### 1. **Verification Service** (`services/verification.service.js`)

```javascript
class VerificationService {
  
  async verifyOfferLetter(file) {
    // 1. Upload to secure cloud storage (AWS S3/Cloudinary)
    const fileUrl = await uploadToCloud(file);
    
    // 2. OCR scan using Tesseract.js or AWS Textract
    const extractedText = await performOCR(fileUrl);
    
    // 3. Parse for company name, role, CTC
    const parsedData = await parseOfferLetterData(extractedText);
    
    // 4. Match against submitted experience data
    const isValid = matchData(parsedData, experienceData);
    
    return {
      isValid,
      extractedData: parsedData,
      documentUrl: fileUrl
    };
  }
  
  async verifyLinkedInPost(postUrl) {
    // 1. Validate LinkedIn URL format
    if (!isValidLinkedInUrl(postUrl)) return false;
    
    // 2. Optional: Use LinkedIn API or web scraping (Puppeteer)
    //    to verify post exists and contains placement info
    
    // 3. For MVP: Just validate URL format and mark for manual review
    return {
      isValid: true,
      requiresManualReview: true
    };
  }
}
```

---

#### 2. **Filter & Search Service** (`services/experience.service.js`)

```javascript
class ExperienceService {
  
  async getExperiences(filters) {
    const query = {};
    
    // Apply filters
    if (filters.company) {
      query['company.name'] = { $regex: filters.company, $options: 'i' };
    }
    
    if (filters.techStack && filters.techStack.length > 0) {
      query['techStack.technology'] = { $in: filters.techStack };
    }
    
    if (filters.verified === true) {
      query['verification.isVerified'] = true;
    }
    
    if (filters.difficulty) {
      const [min, max] = filters.difficulty.split('-');
      query['difficultyRating'] = { 
        $gte: parseInt(min), 
        $lte: max ? parseInt(max) : 5 
      };
    }
    
    // Full-text search
    if (filters.search) {
      query.$text = { $search: filters.search };
    }
    
    // Sort
    let sortOptions = {};
    switch(filters.sortBy) {
      case 'recent':
        sortOptions = { 'metadata.createdAt': -1 };
        break;
      case 'popular':
        sortOptions = { 'engagement.upvotes': -1 };
        break;
      case 'rating':
        sortOptions = { 'difficultyRating': -1 };
        break;
    }
    
    // Execute query with pagination
    const experiences = await Experience
      .find(query)
      .sort(sortOptions)
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .populate('author', 'username experienceRadarProfile')
      .exec();
    
    const totalCount = await Experience.countDocuments(query);
    
    return {
      experiences,
      pagination: {
        currentPage: filters.page,
        totalPages: Math.ceil(totalCount / filters.limit),
        totalResults: totalCount
      }
    };
  }
}
```

---

#### 3. **Recommendation Service** (For "Related Experiences")

```javascript
class RecommendationService {
  
  async getRelatedExperiences(experienceId) {
    const experience = await Experience.findById(experienceId);
    
    // Find similar experiences based on:
    // 1. Same company
    // 2. Same role type
    // 3. Overlapping tech stack
    
    const related = await Experience.find({
      _id: { $ne: experienceId },
      $or: [
        { 'company.name': experience.company.name },
        { 'role.title': experience.role.title },
        { 'techStack.technology': { 
            $in: experience.techStack.map(t => t.technology) 
          } 
        }
      ],
      'verification.isVerified': true
    })
    .sort({ 'engagement.upvotes': -1 })
    .limit(5)
    .exec();
    
    return related;
  }
}
```

---

#### 4. **Analytics Service** (Track Views, Engagement)

```javascript
class AnalyticsService {
  
  async trackView(experienceId, userId) {
    // Increment view count (with deduplication per user per day)
    const today = new Date().setHours(0,0,0,0);
    
    const alreadyViewed = await ViewLog.findOne({
      experienceId,
      userId,
      viewedAt: { $gte: today }
    });
    
    if (!alreadyViewed) {
      await ViewLog.create({ experienceId, userId, viewedAt: new Date() });
      await Experience.updateOne(
        { _id: experienceId },
        { $inc: { 'engagement.views': 1 } }
      );
    }
  }
  
  async upvoteExperience(experienceId, userId) {
    // Toggle upvote
    const existingUpvote = await Upvote.findOne({ experienceId, userId });
    
    if (existingUpvote) {
      await Upvote.deleteOne({ _id: existingUpvote._id });
      await Experience.updateOne(
        { _id: experienceId },
        { $inc: { 'engagement.upvotes': -1 } }
      );
    } else {
      await Upvote.create({ experienceId, userId });
      await Experience.updateOne(
        { _id: experienceId },
        { $inc: { 'engagement.upvotes': 1 } }
      );
    }
  }
}
```

---

### Integration with Experience Radar

When displaying an experience, show a link to the author's Experience Radar profile:

**API Call:**
```javascript
GET /api/users/:username/experience-radar
```

**Returns:**
- User's projects
- Skills and proficiency levels
- GitHub contributions
- Linked experiences

**UI Integration:**
In the experience detail view, show:
```
👤 Posted by Rohan Mehta ✓
   [View Full Profile →] links to /experience-radar/rohan_m
   
   Quick Skills: React (Expert), DSA (Advanced), System Design (Intermediate)
   Projects: 12 | GitHub: 340 commits | Verified Placements: 1
```

---

---

# Aim Page (AI Career Roadmap & Target Tracker) {#aim-page}

## 🎨 UI/UX Layout - What Users See

### Hero Section (with 3D Parallax)

```
┌─────────────────────────────────────────────────────┐
│  Background Layer: Animated gradient mesh (slow)    │
│    Mid Layer: Floating skill nodes (medium)         │
│      Foreground: Hero content (fast)                │
│                                                     │
│                                                     │
│         🎯 YOUR CAREER ROADMAP                      │
│         Powered by AI                              │
│                                                     │
│   How ready are you for your dream job?            │
│   Get a personalized roadmap in 3 steps.          │
│                                                     │
│   ┌─────────────────────────────────────┐         │
│   │ 1️⃣ Choose Your Target Company & Role  │         │
│   │ 2️⃣ Upload Resume + Connect GitHub     │         │
│   │ 3️⃣ Get Your AI-Powered Roadmap        │         │
│   └─────────────────────────────────────┘         │
│                                                     │
│   [🚀 Start Your Assessment →]                     │
│                                                     │
│   ✓ 5,240 roadmaps generated                       │
│   ✓ Average readiness improved by 34%              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Step 1: Target Selection

```
┌─────────────────────────────────────────────────────┐
│ ← Back                                              │
│                                                     │
│ STEP 1 OF 3: Choose Your Target                    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 🏢 Target Company                                   │
│ [Search: Google, Microsoft, Amazon...]             │
│                                                     │
│ Popular Targets:                                    │
│ [🔥 Google] [🔥 Microsoft] [🔥 Amazon] [🔥 Meta]   │
│ [Netflix] [Apple] [Uber] [+120 more]               │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 💼 Target Role                                      │
│                                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│ │             │ │             │ │             │  │
│ │   👨‍💻 SDE    │ │  📊 Data    │ │  🎨 Frontend │  │
│ │             │ │  Scientist  │ │  Engineer   │  │
│ │  [Select]   │ │  [Select]   │ │  [Select]   │  │
│ └─────────────┘ └─────────────┘ └─────────────┘  │
│                                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│ │  ⚙️ Backend  │ │  ☁️ DevOps  │ │  📱 Mobile  │  │
│ │  Engineer   │ │  Engineer   │ │  Developer  │  │
│ │  [Select]   │ │  [Select]   │ │  [Select]   │  │
│ └─────────────┘ └─────────────┘ └─────────────┘  │
│                                                     │
│ [Custom Role →]                                     │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 📍 Preferred Location (Optional)                    │
│ [Bangalore ▼]                                       │
│                                                     │
│ [Next: Upload Data →]                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Step 2: Upload Resume & Connect GitHub

```
┌─────────────────────────────────────────────────────┐
│ ← Back                                              │
│                                                     │
│ STEP 2 OF 3: Provide Your Data                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 📄 Upload Your Resume                               │
│                                                     │
│ ┌───────────────────────────────────────────────┐ │
│ │                                               │ │
│ │         📎 Drag & Drop PDF Here               │ │
│ │           or click to browse                  │ │
│ │                                               │ │
│ │   Supported: PDF, DOC, DOCX (Max 5MB)        │ │
│ │                                               │ │
│ └───────────────────────────────────────────────┘ │
│                                                     │
│ We'll extract:                                      │
│ ✓ Skills (languages, frameworks, tools)            │
│ ✓ Work experience & internships                    │
│ ✓ Projects and achievements                        │
│ ✓ Education background                             │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 🔗 Connect Your GitHub (Recommended)                │
│                                                     │
│ ┌───────────────────────────────────────────────┐ │
│ │  🐙 GitHub OAuth                              │ │
│ │                                               │ │
│ │  We'll analyze:                               │ │
│ │  • Your repositories & contributions          │ │
│ │  • Languages used & project complexity        │ │
│ │  • Commit consistency & code quality          │ │
│ │                                               │ │
│ │  [🔐 Connect with GitHub]                     │ │
│ │                                               │ │
│ │  🔒 Your data is secure and never shared     │ │
│ └───────────────────────────────────────────────┘ │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 🔗 LinkedIn Profile (Optional)                      │
│ [https://linkedin.com/in/...]                      │
│                                                     │
│ [Skip]                    [Next: Generate Roadmap] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Loading State After Submission:**

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           🔄 Analyzing Your Profile...              │
│                                                     │
│   ┌───────────────────────────────────────────┐   │
│   │ ████████████░░░░░░░░░░░ 65%              │   │
│   └───────────────────────────────────────────┘   │
│                                                     │
│   ✓ Resume parsed successfully                     │
│   ✓ GitHub repos scanned (12 repositories)         │
│   ⏳ Matching against job requirements...           │
│   ⏳ Generating personalized roadmap...             │
│                                                     │
│   This will take ~30 seconds                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Step 3: AI-Generated Roadmap (Main Result Page)

This is the most critical page with heavy 3D parallax effects.

#### **Readiness Score Dashboard** (Top Section)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   YOUR CAREER READINESS REPORT                     │
│   Target: Software Engineer at Google              │
│   Generated on: Feb 22, 2026                       │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│         ┌─────────────────────────┐                │
│         │                         │                │
│         │        72%              │  ← Large       │
│         │    READY                │     circular   │
│         │                         │     gauge      │
│         │   [███████░░░]          │                │
│         │                         │                │
│         └─────────────────────────┘                │
│                                                     │
│   You're close! Here's the breakdown:              │
│                                                     │
│   ✅ Strong Areas (8/12)                            │
│   • JavaScript/TypeScript • React/Frontend          │
│   • Git/GitHub • Problem Solving                   │
│   • REST APIs • Databases (SQL)                    │
│   • Testing • Communication                        │
│                                                     │
│   ⚠️ Needs Improvement (3/12)                       │
│   • System Design (Beginner → Intermediate)        │
│   • Data Structures & Algorithms (More practice)   │
│   • Cloud Services (AWS/GCP)                       │
│                                                     │
│   ❌ Missing Skills (1/12)                          │
│   • Microservices Architecture                     │
│                                                     │
└─────────────────────────────────────────────────────┘

        ↓ (Scroll down with 3D parallax)
        Background moves slower than cards

┌─────────────────────────────────────────────────────┐
│                                                     │
│   📊 SKILL MATCH BREAKDOWN                          │
│                                                     │
│   Required Skills for Software Engineer @ Google:  │
│                                                     │
│   ┌─────────────────────────────────────────────┐ │
│   │ JavaScript/TypeScript    [████████] 90%     │ │
│   │ Your Level: Expert ✓                        │ │
│   │                                             │ │
│   │ Detected from:                              │ │
│   │ • Resume: 3 years experience                │ │
│   │ • GitHub: 45% of code in JS/TS              │ │
│   │ • Projects: React Dashboard, Node API       │ │
│   └─────────────────────────────────────────────┘ │
│                                                     │
│   ┌─────────────────────────────────────────────┐ │
│   │ React & Frontend         [████████] 85%     │ │
│   │ Your Level: Advanced ✓                      │ │
│   │                                             │ │
│   │ Detected from:                              │ │
│   │ • Resume: "Built 5+ React apps"             │ │
│   │ • GitHub: react-dashboard (340 stars)       │ │
│   └─────────────────────────────────────────────┘ │
│                                                     │
│   ┌─────────────────────────────────────────────┐ │
│   │ Data Structures & Algorithms [████░░] 55%   │ │
│   │ Your Level: Intermediate ⚠️                  │ │
│   │ Expected: Advanced                          │ │
│   │                                             │ │
│   │ Gap: Need 200+ LeetCode problems            │ │
│   │ Focus: Trees, Graphs, Dynamic Programming   │ │
│   │                                             │ │
│   │ [📚 See Recommendations →]                   │ │
│   └─────────────────────────────────────────────┘ │
│                                                     │
│   ┌─────────────────────────────────────────────┐ │
│   │ System Design            [███░░░] 40%       │ │
│   │ Your Level: Beginner ⚠️                      │ │
│   │ Expected: Intermediate-Advanced             │ │
│   │                                             │ │
│   │ Gap: No system design projects detected     │ │
│   │ Recommended: Build scalable backend system  │ │
│   │                                             │ │
│   │ [📚 See Recommendations →]                   │ │
│   └─────────────────────────────────────────────┘ │
│                                                     │
│   ┌─────────────────────────────────────────────┐ │
│   │ Cloud Services (AWS/GCP) [██░░░░] 25%      │ │
│   │ Your Level: Beginner ⚠️                      │ │
│   │ Expected: Intermediate                      │ │
│   │                                             │ │
│   │ Gap: No cloud deployment experience         │ │
│   │                                             │ │
│   │ [📚 See Recommendations →]                   │ │
│   └─────────────────────────────────────────────┘ │
│                                                     │
│   ┌─────────────────────────────────────────────┐ │
│   │ Microservices Architecture [░░░░░░] 0%      │ │
│   │ Your Level: None ❌                          │ │
│   │ Expected: Basic-Intermediate                │ │
│   │                                             │ │
│   │ Gap: This is a critical missing skill       │ │
│   │                                             │ │
│   │ [📚 See Recommendations →]                   │ │
│   └─────────────────────────────────────────────┘ │
│                                                     │
│   [View Full Report PDF ↓]                         │
│                                                     │
└─────────────────────────────────────────────────────┘

        ↓ (Continue scrolling with 3D parallax)
        This is where the magic happens - roadmap nodes
        float in 3D space as user scrolls

┌─────────────────────────────────────────────────────┐
│                                                     │
│   🗺️ YOUR PERSONALIZED ROADMAP                     │
│   Follow this path to close the gap                │
│                                                     │
│   Estimated Timeline: 3-4 months                    │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│                                                     │
│              ╭───────────────────╮                  │
│              │   WEEK 1-3       │  ← Floating      │
│              │                   │     node with    │
│              │  🎯 DSA Sprint    │     3D shadow    │
│              ╰───────────────────╯                  │
│                    ↓                                │
│              Goal: Solve 100 problems               │
│              Focus on: Trees & Graphs               │
│                                                     │
│              📚 Resources:                          │
│              • LeetCode Premium (Patterns)          │
│                [Get 10% discount with code NEXUS]  │
│              • "Grokking Algorithms" (Free)         │
│                [View on Archive.org →]             │
│              • Striver's A2Z DSA Sheet              │
│                [Start Here →]                       │
│                                                     │
│              ✏️ Action Items:                        │
│              □ 5 Tree problems per day (15 days)    │
│              □ 5 Graph problems per day (15 days)   │
│              □ Take notes on patterns               │
│                                                     │
│              [Mark as Started] [Mark as Complete]  │
│                                                     │
│                    ↓                                │
│              ╭───────────────────╮                  │
│              │   WEEK 4-6       │                  │
│              │                   │                  │
│              │  ☁️ Cloud Basics  │                  │
│              ╰───────────────────╯                  │
│                    ↓                                │
│              Goal: Deploy a full-stack app on AWS  │
│                                                     │
│              📚 Resources:                          │
│              • AWS Free Tier Account                │
│                [Sign Up →]                          │
│              • "AWS for Developers" Course          │
│                (Udemy - 4.7★, $12.99)               │
│                [Enroll →]                           │
│              • Deploy MERN app tutorial             │
│                [YouTube Playlist →]                 │
│                                                     │
│              ✏️ Action Items:                        │
│              □ Set up EC2 instance                  │
│              □ Configure S3 for static files        │
│              □ Set up RDS (PostgreSQL)              │
│              □ Deploy your existing React project   │
│              □ Set up CloudFront CDN                │
│              □ Add this project to resume           │
│                                                     │
│              💡 Pro Tip: Document this deployment   │
│                 process in a blog post for bonus    │
│                 points during interviews!           │
│                                                     │
│              [Mark as Started] [Mark as Complete]  │
│                                                     │
│                    ↓                                │
│              ╭───────────────────╮                  │
│              │   WEEK 7-9       │                  │
│              │                   │                  │
│              │  🏗️ System Design │                  │
│              ╰───────────────────╯                  │
│                    ↓                                │
│              Goal: Understand key system concepts  │
│                                                     │
│              📚 Resources:                          │
│              • "System Design Primer" (GitHub)      │
│                [Read Here →]                        │
│              • "Designing Data-Intensive Apps"      │
│                (Book - Available on Library)        │
│                [Download →]                         │
│              • Mock System Design Interviews        │
│                (Free on Pramp)                      │
│                [Schedule Sessions →]                │
│                                                     │
│              ✏️ Action Items:                        │
│              □ Study: Load Balancers, Caching       │
│              □ Study: Database Sharding, CAP        │
│              □ Study: CDNs, Message Queues          │
│              □ Practice: Design Instagram           │
│              □ Practice: Design URL Shortener       │
│              □ Practice: Design Netflix             │
│              □ Do 5 mock interviews                 │
│                                                     │
│              [Mark as Started] [Mark as Complete]  │
│                                                     │
│                    ↓                                │
│              ╭───────────────────╮                  │
│              │   WEEK 10-12     │                  │
│              │                   │                  │
│              │  🚀 Capstone     │                  │
│              │     Project       │                  │
│              ╰───────────────────╯                  │
│                    ↓                                │
│              Goal: Build a microservices-based app │
│                                                     │
│              🎯 Project Idea:                       │
│              "DistroMart - Scalable E-commerce API" │
│                                                     │
│              Tech Stack:                            │
│              • Node.js + Express (API Gateway)      │
│              • MongoDB (Product Service)            │
│              • PostgreSQL (User Service)            │
│              • Redis (Caching)                      │
│              • RabbitMQ (Message Queue)             │
│              • Docker + Kubernetes                  │
│              • Deployed on AWS ECS                  │
│                                                     │
│              Features to Implement:                 │
│              □ User authentication (JWT)            │
│              □ Product catalog service              │
│              □ Order processing service             │
│              □ Payment gateway integration          │
│              □ Real-time notifications              │
│              □ Load testing (Apache JMeter)         │
│                                                     │
│              📚 Tutorial:                            │
│              • "Build Microservices Architecture"   │
│                [Step-by-step guide →]               │
│                                                     │
│              [Mark as Started] [Mark as Complete]  │
│                                                     │
│                    ↓                                │
│              ╭───────────────────╮                  │
│              │   ONGOING        │                  │
│              │                   │                  │
│              │  📝 Resume &     │                  │
│              │     Portfolio     │                  │
│              ╰───────────────────╯                  │
│                    ↓                                │
│              Goal: Update all profiles             │
│                                                     │
│              ✏️ Action Items:                        │
│              □ Add new projects to resume           │
│                [Use Nexus Resume Builder →]         │
│              □ Update GitHub README files           │
│              □ Write blog posts about learnings     │
│              □ Update LinkedIn with new skills      │
│              □ Add certifications (if any)          │
│                                                     │
│              [Go to Resume Builder →]               │
│                                                     │
│                    ↓                                │
│                   🎉                                │
│         ╭─────────────────────╮                     │
│         │   YOU'RE READY!     │                     │
│         │                     │                     │
│         │  Start applying to  │                     │
│         │  Google now!        │                     │
│         ╰─────────────────────╯                     │
│                                                     │
│   [📧 Email me this roadmap] [💾 Save as PDF]      │
│   [🔄 Generate new roadmap]                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**3D Parallax Effects on Roadmap:**
- Background galaxy/mesh pattern moves at 0.2x scroll speed
- Roadmap nodes (week boxes) move at 0.7x scroll speed
- Text content moves at 1x scroll speed
- Creates illusion of "descending down a career path"
- Each node has a slight 3D rotation on scroll (CSS transform)
- Connecting arrows fade in as nodes enter viewport

---

### Progress Tracker (Dashboard for Returning Users)

Once a user has a roadmap, they can return to track progress:

```
┌─────────────────────────────────────────────────────┐
│  Navbar: [Dashboard] [My Roadmap] [Profile]        │
│                                                     │
│  👋 Welcome back, Rohan!                            │
│                                                     │
│  🎯 Your Active Goal: Software Engineer @ Google    │
│  Progress: Day 28 of 90                            │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ██████████░░░░░░░░░░░ 31% Complete         │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│  📅 THIS WEEK'S TASKS (Week 4: Cloud Basics)        │
│                                                     │
│  ✅ Set up AWS Free Tier account                    │
│  ✅ Launch EC2 instance                             │
│  ⏳ Configure S3 bucket (In Progress)                │
│  ⬜ Deploy React app                                 │
│  ⬜ Set up CloudFront CDN                            │
│                                                     │
│  [View Full Roadmap →]                             │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│  📊 SKILL PROGRESS                                  │
│                                                     │
│  DSA Skills:      [████████░░] 75% → 85% (+10%)    │
│  Cloud Services:  [██░░░░░░░░] 25% → 35% (+10%)    │
│  System Design:   [███░░░░░░░] 40% → 45% (+5%)     │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│  🏆 ACHIEVEMENTS                                    │
│  • 100 LeetCode Problems Solved! 🎉                 │
│  • First Cloud Deployment 🚀                        │
│                                                     │
│  [View All Achievements →]                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🏗️ Backend Architecture - Aim Page

### Database Schema

```javascript
// Roadmaps Collection
{
  _id: ObjectId,
  userId: ObjectId,                    // Reference to User
  
  target: {
    company: String,                   // "Google"
    companyId: ObjectId,               // Reference to Companies collection
    role: String,                      // "Software Engineer"
    location: String                   // "Bangalore"
  },
  
  userProfile: {
    resumeUrl: String,                 // Stored resume PDF
    githubUsername: String,
    linkedinUrl: String,
    
    extractedData: {
      skills: [
        {
          name: String,                // "JavaScript", "React"
          proficiency: String,         // "Expert", "Advanced", "Intermediate"
          source: String               // "Resume", "GitHub", "Inferred"
        }
      ],
      
      experience: [
        {
          company: String,
          role: String,
          duration: String,            // "2 years"
          description: String
        }
      ],
      
      projects: [
        {
          name: String,
          description: String,
          techStack: [String],
          githubUrl: String,
          liveUrl: String
        }
      ],
      
      education: {
        degree: String,
        institution: String,
        graduationYear: Number
      }
    }
  },
  
  githubAnalysis: {
    username: String,
    totalRepos: Number,
    totalCommits: Number,
    totalStars: Number,
    
    languageBreakdown: [
      {
        language: String,              // "JavaScript"
        percentage: Number,            // 45.2
        linesOfCode: Number
      }
    ],
    
    topRepositories: [
      {
        name: String,
        description: String,
        stars: Number,
        forks: Number,
        primaryLanguage: String,
        topics: [String],
        lastUpdated: Date
      }
    ],
    
    commitActivity: {
      avgCommitsPerMonth: Number,
      longestStreak: Number,
      contributionsLastYear: Number
    },
    
    projectComplexity: String          // "Basic", "Intermediate", "Advanced"
  },
  
  jobRequirements: {
    // Fetched from job posting or predefined templates
    requiredSkills: [
      {
        skill: String,
        importance: String,            // "Critical", "Important", "Nice-to-have"
        requiredLevel: String          // "Expert", "Advanced", "Intermediate"
      }
    ],
    
    experienceYears: Number,
    educationRequired: String,
    
    preferredProjects: [String],       // Types of projects that help
    
    interviewFormat: {
      hasOA: Boolean,
      hasDSA: Boolean,
      hasSystemDesign: Boolean,
      hasBehavioral: Boolean,
      hasTakeHome: Boolean
    }
  },
  
  matchingScore: {
    overallScore: Number,              // 0-100
    breakdown: [
      {
        category: String,              // "Technical Skills", "Experience"
        score: Number,
        maxScore: Number,
        feedback: String
      }
    ],
    
    strengths: [String],               // Skills where user exceeds requirements
    improvements: [String],            // Skills that need work
    critical: [String]                 // Must-have skills user lacks
  },
  
  roadmap: {
    totalDurationWeeks: Number,        // Estimated timeline
    phases: [
      {
        phaseNumber: Number,
        week: String,                  // "Week 1-3"
        title: String,                 // "DSA Sprint"
        goal: String,
        
        resources: [
          {
            title: String,
            type: String,              // "Course", "Book", "Tutorial", "Platform"
            url: String,
            price: String,             // "Free", "$12.99"
            rating: Number,            // 4.7
            duration: String           // "40 hours"
          }
        ],
        
        actionItems: [
          {
            task: String,
            completed: Boolean,
            completedDate: Date
          }
        ],
        
        skillsTargeted: [String],      // Which skills this phase improves
        
        completed: Boolean
      }
    ],
    
    capstoneProject: {
      title: String,
      description: String,
      techStack: [String],
      features: [String],
      estimatedDuration: String,
      tutorialUrl: String
    }
  },
  
  progress: {
    currentPhase: Number,
    completedPhases: [Number],
    tasksCompleted: Number,
    totalTasks: Number,
    lastUpdated: Date,
    
    achievements: [
      {
        title: String,
        description: String,
        earnedDate: Date,
        icon: String
      }
    ]
  },
  
  metadata: {
    createdAt: Date,
    updatedAt: Date,
    lastRescan: Date,                  // When GitHub was last rescanned
    version: Number                    // For roadmap updates
  }
}

// Job Requirements Templates (Pre-defined for common roles)
{
  _id: ObjectId,
  company: String,
  role: String,
  level: String,                       // "Entry", "Mid", "Senior"
  requiredSkills: [...],               // Same structure as above
  interviewFormat: {...},
  updatedDate: Date
}
```

---

### API Endpoints - Aim Page

#### 1. **POST** `/api/roadmap/generate` (Generate New Roadmap)

**Request Body (Multipart Form):**
```javascript
{
  targetCompany: "Google",
  targetRole: "Software Engineer",
  targetLocation: "Bangalore",
  resumeFile: File,                    // PDF upload
  githubUsername: "rohan_mehta",       // Optional
  linkedinUrl: "https://linkedin.com/in/rohan"  // Optional
}
```

**Processing Steps:**
1. Store resume in cloud storage (AWS S3)
2. Parse resume using PDF parser + NLP
3. If GitHub provided, fetch repos via GitHub API
4. Analyze GitHub data (languages, commits, complexity)
5. Fetch job requirements for target company/role
6. Calculate matching score
7. Generate personalized roadmap using AI/rule-based engine
8. Store in database
9. Return roadmap ID and initial data

**Response:**
```javascript
{
  success: true,
  data: {
    roadmapId: "...",
    matchingScore: {
      overallScore: 72,
      breakdown: [
        {
          category: "Technical Skills",
          score: 18,
          maxScore: 25,
          feedback: "Strong in frontend, need backend depth"
        },
        {
          category: "DSA Proficiency",
          score: 14,
          maxScore: 25,
          feedback: "Intermediate level, need 100+ more problems"
        }
        // ... more categories
      ],
      strengths: ["JavaScript/TypeScript", "React", "Git"],
      improvements: ["System Design", "Cloud Services"],
      critical: ["Microservices Architecture"]
    },
    roadmap: {
      totalDurationWeeks: 12,
      phases: [
        {
          phaseNumber: 1,
          week: "Week 1-3",
          title: "DSA Sprint",
          goal: "Solve 100 problems focusing on Trees & Graphs",
          resources: [...]
          actionItems: [...]
          skillsTargeted: ["Data Structures", "Algorithms"]
        }
        // ... more phases
      ]
    }
  }
}
```

**Backend Implementation (Simplified):**

```javascript
// controllers/roadmap.controller.js
const generateRoadmap = async (req, res) => {
  try {
    // 1. Upload resume
    const resumeUrl = await uploadToS3(req.files.resumeFile);
    
    // 2. Parse resume
    const resumeData = await ResumeParserService.parse(resumeUrl);
    
    // 3. Analyze GitHub (if provided)
    let githubData = null;
    if (req.body.githubUsername) {
      githubData = await GitHubAnalysisService.analyze(req.body.githubUsername);
    }
    
    // 4. Fetch job requirements
    const jobReqs = await JobRequirementsService.getRequirements(
      req.body.targetCompany,
      req.body.targetRole
    );
    
    // 5. Calculate matching score
    const matching = await MatchingEngine.calculateScore(
      resumeData,
      githubData,
      jobReqs
    );
    
    // 6. Generate roadmap
    const roadmap = await RoadmapGenerator.generate(
      matching,
      jobReqs,
      resumeData,
      githubData
    );
    
    // 7. Store in database
    const savedRoadmap = await Roadmap.create({
      userId: req.user._id,
      target: {
        company: req.body.targetCompany,
        role: req.body.targetRole,
        location: req.body.targetLocation
      },
      userProfile: {
        resumeUrl,
        githubUsername: req.body.githubUsername,
        extractedData: resumeData
      },
      githubAnalysis: githubData,
      jobRequirements: jobReqs,
      matchingScore: matching,
      roadmap
    });
    
    res.json({
      success: true,
      data: {
        roadmapId: savedRoadmap._id,
        matchingScore: matching,
        roadmap: roadmap
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

---

#### 2. **GET** `/api/roadmap/:id` (Fetch Existing Roadmap)

**Response:**
```javascript
{
  success: true,
  data: {
    roadmap: {
      // Full roadmap object
    }
  }
}
```

---

#### 3. **PATCH** `/api/roadmap/:id/progress` (Update Progress)

**Request Body:**
```javascript
{
  phaseNumber: 1,
  actionItemIndex: 2,
  completed: true
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    updatedProgress: {
      currentPhase: 1,
      tasksCompleted: 3,
      totalTasks: 25,
      percentComplete: 12
    },
    newAchievement: {
      title: "First Step!",
      description: "Completed your first task"
    }
  }
}
```

---

#### 4. **POST** `/api/roadmap/:id/rescan` (Re-analyze GitHub)

Allows users to rescan their GitHub after making updates.

**Request Body:**
```javascript
{
  githubUsername: "rohan_mehta"
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    updatedMatchingScore: 78,        // Improved from 72!
    changes: [
      "New project detected: microservices-ecommerce",
      "Commit activity increased by 40%"
    ]
  }
}
```

---

### Backend Services & AI Logic

#### 1. **Resume Parser Service** (`services/resumeParser.service.js`)

```javascript
class ResumeParserService {
  
  async parse(resumeUrl) {
    // Method 1: Use external API (e.g., Affinda, Sovren, Resume Parser API)
    // Method 2: Build custom parser with pdf-parse + NLP
    
    // Download PDF
    const pdfBuffer = await downloadFile(resumeUrl);
    
    // Extract text
    const pdfText = await pdfParse(pdfBuffer);
    
    // Use NLP to extract structured data
    const extractedData = await this.extractStructuredData(pdfText.text);
    
    return extractedData;
  }
  
  async extractStructuredData(text) {
    // Use regex + NLP library (compromise.js or natural.js)
    
    // Extract skills
    const skills = this.extractSkills(text);
    
    // Extract experience
    const experience = this.extractExperience(text);
    
    // Extract projects
    const projects = this.extractProjects(text);
    
    // Extract education
    const education = this.extractEducation(text);
    
    return {
      skills,
      experience,
      projects,
      education
    };
  }
  
  extractSkills(text) {
    // Predefined skill dictionary
    const skillDictionary = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js',
      'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes',
      // ... hundreds more
    ];
    
    const foundSkills = [];
    
    skillDictionary.forEach(skill => {
      const regex = new RegExp(`\\b${skill}\\b`, 'gi');
      if (regex.test(text)) {
        foundSkills.push({
          name: skill,
          proficiency: this.inferProficiency(text, skill),
          source: 'Resume'
        });
      }
    });
    
    return foundSkills;
  }
  
  inferProficiency(text, skill) {
    // Look for proficiency indicators
    const expertPatterns = ['expert', 'advanced', 'senior', '5+ years'];
    const advancedPatterns = ['proficient', '3-4 years', 'intermediate-advanced'];
    
    const contextWindow = this.getContextAround(text, skill, 50);
    
    for (let pattern of expertPatterns) {
      if (contextWindow.toLowerCase().includes(pattern)) {
        return 'Expert';
      }
    }
    
    for (let pattern of advancedPatterns) {
      if (contextWindow.toLowerCase().includes(pattern)) {
        return 'Advanced';
      }
    }
    
    return 'Intermediate';
  }
  
  extractExperience(text) {
    // Look for company names, dates, job titles
    // Use date regex: (Jan|Feb|Mar...) \d{4}
    // Use job title patterns: (Engineer|Developer|Analyst)
    
    // Return structured experience array
    return [];
  }
  
  extractProjects(text) {
    // Look for "Projects" section
    // Extract project names, descriptions, tech stacks
    
    return [];
  }
  
  extractEducation(text) {
    // Look for degree names, universities, graduation years
    
    return {};
  }
}
```

---

#### 2. **GitHub Analysis Service** (`services/githubAnalysis.service.js`)

```javascript
class GitHubAnalysisService {
  
  async analyze(username) {
    const githubToken = process.env.GITHUB_TOKEN;  // OAuth token
    
    // Fetch user data
    const userData = await this.fetchUserData(username, githubToken);
    
    // Fetch all repos
    const repos = await this.fetchAllRepos(username, githubToken);
    
    // Analyze repos
    const analysis = await this.analyzeRepositories(repos, githubToken);
    
    return {
      username,
      totalRepos: repos.length,
      totalCommits: analysis.totalCommits,
      totalStars: analysis.totalStars,
      languageBreakdown: analysis.languageBreakdown,
      topRepositories: analysis.topRepos,
      commitActivity: analysis.commitActivity,
      projectComplexity: analysis.projectComplexity
    };
  }
  
  async fetchUserData(username, token) {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: { Authorization: `token ${token}` }
    });
    return await response.json();
  }
  
  async fetchAllRepos(username, token) {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      { headers: { Authorization: `token ${token}` } }
    );
    return await response.json();
  }
  
  async analyzeRepositories(repos, token) {
    let totalStars = 0;
    let totalCommits = 0;
    let languageStats = {};
    
    // Analyze each repo
    for (let repo of repos) {
      totalStars += repo.stargazers_count;
      
      // Fetch languages for this repo
      const langResponse = await fetch(repo.languages_url, {
        headers: { Authorization: `token ${token}` }
      });
      const languages = await langResponse.json();
      
      // Aggregate language stats
      for (let [lang, bytes] of Object.entries(languages)) {
        languageStats[lang] = (languageStats[lang] || 0) + bytes;
      }
      
      // Fetch commit count
      const commitsResponse = await fetch(
        `${repo.url}/commits?per_page=1`,
        { headers: { Authorization: `token ${token}` } }
      );
      
      // Get total from Link header
      const linkHeader = commitsResponse.headers.get('Link');
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (match) totalCommits += parseInt(match[1]);
      }
    }
    
    // Convert language stats to percentages
    const totalBytes = Object.values(languageStats).reduce((a, b) => a + b, 0);
    const languageBreakdown = Object.entries(languageStats)
      .map(([lang, bytes]) => ({
        language: lang,
        percentage: (bytes / totalBytes * 100).toFixed(1),
        linesOfCode: Math.floor(bytes / 50)  // Rough estimate
      }))
      .sort((a, b) => b.percentage - a.percentage);
    
    // Determine top repos
    const topRepos = repos
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
      .map(repo => ({
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        primaryLanguage: repo.language,
        topics: repo.topics,
        lastUpdated: repo.updated_at
      }));
    
    // Determine project complexity
    const projectComplexity = this.assessComplexity(repos, languageBreakdown);
    
    return {
      totalStars,
      totalCommits,
      languageBreakdown,
      topRepos,
      commitActivity: {
        avgCommitsPerMonth: 0,  // Calculate based on dates
        longestStreak: 0,
        contributionsLastYear: totalCommits
      },
      projectComplexity
    };
  }
  
  assessComplexity(repos, languages) {
    // Factors:
    // 1. Number of repos > 10
    // 2. Total stars > 50
    // 3. Multiple languages used
    // 4. Recent activity
    // 5. Presence of deployment configs (Dockerfile, k8s)
    
    let score = 0;
    
    if (repos.length >= 10) score += 2;
    if (repos.length >= 20) score += 1;
    
    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
    if (totalStars >= 50) score += 2;
    if (totalStars >= 200) score += 1;
    
    if (languages.length >= 3) score += 2;
    if (languages.length >= 5) score += 1;
    
    // Check for advanced topics/keywords
    const advancedKeywords = ['docker', 'kubernetes', 'microservices', 'ci/cd'];
    const hasAdvanced = repos.some(repo => 
      advancedKeywords.some(keyword => 
        repo.description?.toLowerCase().includes(keyword) ||
        repo.topics?.includes(keyword)
      )
    );
    if (hasAdvanced) score += 3;
    
    if (score >= 8) return 'Advanced';
    if (score >= 5) return 'Intermediate';
    return 'Basic';
  }
}
```

---

#### 3. **Job Requirements Service** (`services/jobRequirements.service.js`)

```javascript
class JobRequirementsService {
  
  async getRequirements(company, role) {
    // Try to fetch from database (pre-scraped data)
    const template = await JobTemplate.findOne({ 
      company: new RegExp(company, 'i'),
      role: new RegExp(role, 'i')
    });
    
    if (template) {
      return template.toObject();
    }
    
    // Fallback: Use generic template based on role
    return this.getGenericTemplate(role);
  }
  
  getGenericTemplate(role) {
    const templates = {
      'Software Engineer': {
        requiredSkills: [
          { skill: 'Data Structures & Algorithms', importance: 'Critical', requiredLevel: 'Advanced' },
          { skill: 'JavaScript/TypeScript', importance: 'Critical', requiredLevel: 'Advanced' },
          { skill: 'React or Angular or Vue', importance: 'Important', requiredLevel: 'Intermediate' },
          { skill: 'Node.js or Python or Java', importance: 'Important', requiredLevel: 'Intermediate' },
          { skill: 'System Design', importance: 'Important', requiredLevel: 'Intermediate' },
          { skill: 'Databases (SQL/NoSQL)', importance: 'Important', requiredLevel: 'Intermediate' },
          { skill: 'Git/Version Control', importance: 'Important', requiredLevel: 'Intermediate' },
          { skill: 'RESTful APIs', importance: 'Important', requiredLevel: 'Intermediate' },
          { skill: 'Cloud Services (AWS/GCP/Azure)', importance: 'Nice-to-have', requiredLevel: 'Basic' },
          { skill: 'Docker/Kubernetes', importance: 'Nice-to-have', requiredLevel: 'Basic' },
          { skill: 'Microservices Architecture', importance: 'Nice-to-have', requiredLevel: 'Basic' },
          { skill: 'Testing (Unit/Integration)', importance: 'Important', requiredLevel: 'Intermediate' }
        ],
        experienceYears: 2,
        educationRequired: "Bachelor's in CS or related field",
        preferredProjects: [
          'Full-stack web application',
          'API development',
          'Database design',
          'System design project'
        ],
        interviewFormat: {
          hasOA: true,
          hasDSA: true,
          hasSystemDesign: true,
          hasBehavioral: true,
          hasTakeHome: false
        }
      },
      
      'Data Scientist': {
        requiredSkills: [
          { skill: 'Python', importance: 'Critical', requiredLevel: 'Advanced' },
          { skill: 'Machine Learning', importance: 'Critical', requiredLevel: 'Advanced' },
          { skill: 'Statistics & Probability', importance: 'Critical', requiredLevel: 'Advanced' },
          { skill: 'Pandas/NumPy', importance: 'Important', requiredLevel: 'Advanced' },
          { skill: 'SQL', importance: 'Important', requiredLevel: 'Intermediate' },
          { skill: 'Data Visualization (Matplotlib/Seaborn)', importance: 'Important', requiredLevel: 'Intermediate' },
          { skill: 'Deep Learning (TensorFlow/PyTorch)', importance: 'Nice-to-have', requiredLevel: 'Intermediate' },
          { skill: 'Big Data (Spark/Hadoop)', importance: 'Nice-to-have', requiredLevel: 'Basic' }
        ],
        // ... more fields
      }
      
      // ... more role templates
    };
    
    // Return matching template or default
    for (let [key, template] of Object.entries(templates)) {
      if (role.toLowerCase().includes(key.toLowerCase())) {
        return template;
      }
    }
    
    return templates['Software Engineer'];  // Default fallback
  }
}
```

---

#### 4. **Matching Engine** (`services/matchingEngine.service.js`)

```javascript
class MatchingEngine {
  
  async calculateScore(resumeData, githubData, jobRequirements) {
    const breakdown = [];
    
    // 1. Technical Skills Matching (40 points)
    const skillsScore = this.matchSkills(
      resumeData.skills,
      githubData?.languageBreakdown,
      jobRequirements.requiredSkills
    );
    breakdown.push({
      category: 'Technical Skills',
      score: skillsScore.score,
      maxScore: 40,
      feedback: skillsScore.feedback
    });
    
    // 2. DSA Proficiency (25 points)
    const dsaScore = this.assessDSA(resumeData, githubData);
    breakdown.push({
      category: 'DSA Proficiency',
      score: dsaScore.score,
      maxScore: 25,
      feedback: dsaScore.feedback
    });
    
    // 3. Project Quality & Relevance (20 points)
    const projectScore = this.assessProjects(
      resumeData.projects,
      githubData?.topRepositories,
      jobRequirements.preferredProjects
    );
    breakdown.push({
      category: 'Projects',
      score: projectScore.score,
      maxScore: 20,
      feedback: projectScore.feedback
    });
    
    // 4. Experience (15 points)
    const expScore = this.assessExperience(
      resumeData.experience,
      jobRequirements.experienceYears
    );
    breakdown.push({
      category: 'Experience',
      score: expScore.score,
      maxScore: 15,
      feedback: expScore.feedback
    });
    
    const totalScore = breakdown.reduce((sum, item) => sum + item.score, 0);
    
    // Identify strengths, improvements, critical gaps
    const { strengths, improvements, critical } = this.categorizeSkillGaps(
      resumeData,
      githubData,
      jobRequirements
    );
    
    return {
      overallScore: totalScore,
      breakdown,
      strengths,
      improvements,
      critical
    };
  }
  
  matchSkills(resumeSkills, githubLanguages, requiredSkills) {
    let score = 0;
    const maxScore = 40;
    let feedback = '';
    
    // Create user skill map
    const userSkillMap = {};
    resumeSkills.forEach(skill => {
      userSkillMap[skill.name.toLowerCase()] = skill.proficiency;
    });
    
    // Add GitHub languages
    if (githubLanguages) {
      githubLanguages.forEach(lang => {
        const skillName = lang.language.toLowerCase();
        if (!userSkillMap[skillName]) {
          userSkillMap[skillName] = 'Intermediate';  // Inferred from usage
        }
      });
    }
    
    // Match against required skills
    let criticalMatches = 0;
    let criticalTotal = 0;
    let importantMatches = 0;
    let importantTotal = 0;
    
    requiredSkills.forEach(reqSkill => {
      const skillName = reqSkill.skill.toLowerCase();
      const userHasSkill = Object.keys(userSkillMap).some(
        userSkill => userSkill.includes(skillName) || skillName.includes(userSkill)
      );
      
      if (reqSkill.importance === 'Critical') {
        criticalTotal++;
        if (userHasSkill) criticalMatches++;
      } else if (reqSkill.importance === 'Important') {
        importantTotal++;
        if (userHasSkill) importantMatches++;
      }
    });
    
    // Calculate score
    const criticalPercent = criticalTotal > 0 ? criticalMatches / criticalTotal : 0;
    const importantPercent = importantTotal > 0 ? importantMatches / importantTotal : 0;
    
    score = (criticalPercent * 25) + (importantPercent * 15);
    
    feedback = `Matched ${criticalMatches}/${criticalTotal} critical skills, ${importantMatches}/${importantTotal} important skills.`;
    
    return { score, feedback };
  }
  
  assessDSA(resumeData, githubData) {
    // Look for indicators of DSA skills:
    // 1. Mention of LeetCode, Codeforces, etc.
    // 2. DSA courses in resume
    // 3. Competitive programming mentions
    // 4. GitHub repos with DSA problems
    
    let score = 0;
    const maxScore = 25;
    
    // Check resume for DSA keywords
    const dsaKeywords = ['leetcode', 'data structures', 'algorithms', 'competitive programming', 'codeforces', 'hackerrank'];
    const resumeText = JSON.stringify(resumeData).toLowerCase();
    
    const hasLeetCode = dsaKeywords.some(keyword => resumeText.includes(keyword));
    if (hasLeetCode) score += 10;
    
    // Check GitHub for DSA repos
    if (githubData?.topRepositories) {
      const hasDSARepo = githubData.topRepositories.some(repo => 
        repo.name.toLowerCase().includes('dsa') ||
        repo.name.toLowerCase().includes('leetcode') ||
        repo.name.toLowerCase().includes('algorithm') ||
        repo.description?.toLowerCase().includes('data structures')
      );
      if (hasDSARepo) score += 10;
    }
    
    // Default base score
    if (score === 0) score = 5;  // Everyone gets base credit
    
    const feedback = score >= 15 
      ? 'Strong DSA background detected'
      : 'Need more DSA practice (recommend 200+ problems)';
    
    return { score, feedback };
  }
  
  assessProjects(resumeProjects, githubRepos, preferredProjects) {
    let score = 0;
    const maxScore = 20;
    
    // Count quality projects
    const totalProjects = (resumeProjects?.length || 0) + (githubRepos?.length || 0);
    
    if (totalProjects >= 5) score += 8;
    else if (totalProjects >= 3) score += 5;
    else score += 2;
    
    // Check for project complexity
    if (githubRepos) {
      const hasStarredRepo = githubRepos.some(repo => repo.stars > 10);
      if (hasStarredRepo) score += 6;
    }
    
    // Check for preferred project types
    const projectTexts = [
      ...resumeProjects?.map(p => p.description?.toLowerCase()) || [],
      ...githubRepos?.map(r => r.description?.toLowerCase()) || []
    ].join(' ');
    
    preferredProjects.forEach(preferred => {
      if (projectTexts.includes(preferred.toLowerCase())) {
        score += 2;
      }
    });
    
    score = Math.min(score, maxScore);  // Cap at max
    
    const feedback = score >= 15
      ? 'Strong project portfolio'
      : 'Need more substantial projects';
    
    return { score, feedback };
  }
  
  assessExperience(experience, requiredYears) {
    let score = 0;
    const maxScore = 15;
    
    // Calculate total years of experience
    let totalMonths = 0;
    experience?.forEach(exp => {
      // Parse duration (e.g., "2 years", "6 months")
      const yearMatch = exp.duration?.match(/(\d+)\s*year/i);
      const monthMatch = exp.duration?.match(/(\d+)\s*month/i);
      
      if (yearMatch) totalMonths += parseInt(yearMatch[1]) * 12;
      if (monthMatch) totalMonths += parseInt(monthMatch[1]);
    });
    
    const totalYears = totalMonths / 12;
    
    if (totalYears >= requiredYears) {
      score = maxScore;
    } else {
      score = (totalYears / requiredYears) * maxScore;
    }
    
    const feedback = totalYears >= requiredYears
      ? `${totalYears.toFixed(1)} years experience (meets requirement)`
      : `${totalYears.toFixed(1)} years experience (need ${requiredYears - totalYears.toFixed(1)} more)`;
    
    return { score, feedback };
  }
  
  categorizeSkillGaps(resumeData, githubData, jobRequirements) {
    const userSkills = new Set(
      resumeData.skills.map(s => s.name.toLowerCase())
    );
    
    if (githubData?.languageBreakdown) {
      githubData.languageBreakdown.forEach(lang => {
        userSkills.add(lang.language.toLowerCase());
      });
    }
    
    const strengths = [];
    const improvements = [];
    const critical = [];
    
    jobRequirements.requiredSkills.forEach(reqSkill => {
      const hasSkill = Array.from(userSkills).some(
        userSkill => 
          userSkill.includes(reqSkill.skill.toLowerCase()) ||
          reqSkill.skill.toLowerCase().includes(userSkill)
      );
      
      if (hasSkill) {
        strengths.push(reqSkill.skill);
      } else {
        if (reqSkill.importance === 'Critical') {
          critical.push(reqSkill.skill);
        } else if (reqSkill.importance === 'Important') {
          improvements.push(reqSkill.skill);
        }
      }
    });
    
    return { strengths, improvements, critical };
  }
}
```

---

#### 5. **Roadmap Generator** (`services/roadmapGenerator.service.js`)

```javascript
class RoadmapGenerator {
  
  async generate(matchingScore, jobRequirements, resumeData, githubData) {
    const roadmapPhases = [];
    let weekCounter = 1;
    
    // Phase 1: Address DSA if needed
    if (matchingScore.breakdown.find(b => b.category === 'DSA Proficiency').score < 18) {
      roadmapPhases.push(this.createDSAPhase(weekCounter));
      weekCounter += 3;  // DSA phase is 3 weeks
    }
    
    // Phase 2: Address missing critical technical skills
    const criticalGaps = matchingScore.critical;
    if (criticalGaps.includes('System Design')) {
      roadmapPhases.push(this.createSystemDesignPhase(weekCounter));
      weekCounter += 3;
    }
    
    if (criticalGaps.includes('Cloud Services') || criticalGaps.includes('AWS')) {
      roadmapPhases.push(this.createCloudPhase(weekCounter));
      weekCounter += 3;
    }
    
    // Phase 3: Capstone project
    roadmapPhases.push(this.createCapstonePhase(weekCounter, criticalGaps));
    weekCounter += 3;
    
    // Phase 4: Ongoing - Resume & Portfolio
    roadmapPhases.push(this.createOngoingPhase());
    
    return {
      totalDurationWeeks: weekCounter - 1,
      phases: roadmapPhases,
      capstoneProject: this.generateCapstoneProject(criticalGaps, jobRequirements)
    };
  }
  
  createDSAPhase(startWeek) {
    return {
      phaseNumber: 1,
      week: `Week ${startWeek}-${startWeek + 2}`,
      title: 'DSA Sprint',
      goal: 'Solve 100 problems focusing on Trees, Graphs, and Dynamic Programming',
      
      resources: [
        {
          title: 'LeetCode Premium',
          type: 'Platform',
          url: 'https://leetcode.com/subscribe',
          price: '$35/month',
          rating: 4.8,
          duration: '3 weeks'
        },
        {
          title: 'Grokking Algorithms',
          type: 'Book',
          url: 'https://www.manning.com/books/grokking-algorithms',
          price: 'Free',
          rating: 4.6,
          duration: 'Self-paced'
        },
        {
          title: "Striver's A2Z DSA Sheet",
          type: 'Tutorial',
          url: 'https://takeuforward.org/strivers-a2z-dsa-course',
          price: 'Free',
          rating: 4.9,
          duration: '180 hours'
        }
      ],
      
      actionItems: [
        { task: '5 Tree problems per day (15 days)', completed: false },
        { task: '5 Graph problems per day (15 days)', completed: false },
        { task: 'Study common patterns (sliding window, two pointers)', completed: false },
        { task: 'Take detailed notes on each pattern', completed: false },
        { task: 'Attempt 3 mock contests', completed: false }
      ],
      
      skillsTargeted: ['Data Structures', 'Algorithms', 'Problem Solving'],
      completed: false
    };
  }
  
  createSystemDesignPhase(startWeek) {
    return {
      phaseNumber: 2,
      week: `Week ${startWeek}-${startWeek + 2}`,
      title: 'System Design Fundamentals',
      goal: 'Understand key concepts and practice common design problems',
      
      resources: [
        {
          title: 'System Design Primer (GitHub)',
          type: 'Tutorial',
          url: 'https://github.com/donnemartin/system-design-primer',
          price: 'Free',
          rating: 4.9,
          duration: '40 hours'
        },
        {
          title: 'Designing Data-Intensive Applications',
          type: 'Book',
          url: 'https://dataintensive.net',
          price: '$45.99',
          rating: 4.8,
          duration: '60 hours'
        },
        {
          title: 'System Design Mock Interviews',
          type: 'Platform',
          url: 'https://www.pramp.com',
          price: 'Free',
          rating: 4.5,
          duration: '10 sessions'
        }
      ],
      
      actionItems: [
        { task: 'Study: Load Balancers, Caching, CDNs', completed: false },
        { task: 'Study: Database Sharding, Replication, CAP Theorem', completed: false },
        { task: 'Study: Message Queues, Pub/Sub', completed: false },
        { task: 'Practice: Design Instagram', completed: false },
        { task: 'Practice: Design URL Shortener', completed: false },
        { task: 'Practice: Design Netflix', completed: false },
        { task: 'Do 5 mock system design interviews', completed: false }
      ],
      
      skillsTargeted: ['System Design', 'Architecture', 'Scalability'],
      completed: false
    };
  }
  
  createCloudPhase(startWeek) {
    return {
      phaseNumber: 3,
      week: `Week ${startWeek}-${startWeek + 2}`,
      title: 'Cloud Services Fundamentals',
      goal: 'Deploy a full-stack application on AWS',
      
      resources: [
        {
          title: 'AWS Free Tier',
          type: 'Platform',
          url: 'https://aws.amazon.com/free',
          price: 'Free',
          rating: 4.7,
          duration: '12 months free'
        },
        {
          title: 'AWS for Developers',
          type: 'Course',
          url: 'https://www.udemy.com/course/aws-certified-developer-associate',
          price: '$12.99',
          rating: 4.6,
          duration: '20 hours'
        },
        {
          title: 'Deploy MERN Stack on AWS',
          type: 'Tutorial',
          url: 'https://www.youtube.com/watch?v=NjYsXuSBZ5U',
          price: 'Free',
          rating: 4.5,
          duration: '2 hours'
        }
      ],
      
      actionItems: [
        { task: 'Sign up for AWS Free Tier', completed: false },
        { task: 'Launch EC2 instance and SSH into it', completed: false },
        { task: 'Set up S3 bucket for static file storage', completed: false },
        { task: 'Configure RDS (PostgreSQL) database', completed: false },
        { task: 'Deploy React frontend to S3 + CloudFront', completed: false },
        { task: 'Deploy Node.js backend to EC2', completed: false },
        { task: 'Set up Route 53 for custom domain', completed: false },
        { task: 'Add this deployment to resume', completed: false }
      ],
      
      skillsTargeted: ['AWS', 'Cloud Computing', 'DevOps'],
      completed: false
    };
  }
  
  createCapstonePhase(startWeek, gaps) {
    return {
      phaseNumber: 4,
      week: `Week ${startWeek}-${startWeek + 2}`,
      title: 'Capstone Project',
      goal: 'Build a production-ready application that showcases all your skills',
      
      resources: [
        {
          title: 'Microservices with Node.js',
          type: 'Tutorial',
          url: 'https://www.youtube.com/watch?v=CZ3wIuvmHeM',
          price: 'Free',
          rating: 4.7,
          duration: '10 hours'
        }
      ],
      
      actionItems: [
        { task: 'Plan architecture and tech stack', completed: false },
        { task: 'Set up microservices structure', completed: false },
        { task: 'Implement authentication service', completed: false },
        { task: 'Implement core business logic', completed: false },
        { task: 'Add message queue for async processing', completed: false },
        { task: 'Dockerize all services', completed: false },
        { task: 'Deploy to AWS/GCP', completed: false },
        { task: 'Write comprehensive README', completed: false },
        { task: 'Add to portfolio and resume', completed: false }
      ],
      
      skillsTargeted: gaps.length > 0 ? gaps : ['Full-Stack', 'Architecture', 'DevOps'],
      completed: false
    };
  }
  
  createOngoingPhase() {
    return {
      phaseNumber: 5,
      week: 'Ongoing',
      title: 'Resume & Portfolio Updates',
      goal: 'Keep all your profiles up-to-date',
      
      resources: [
        {
          title: 'Nexus Resume Builder',
          type: 'Tool',
          url: '/resume-builder',
          price: 'Free',
          rating: 4.8
        }
      ],
      
      actionItems: [
        { task: 'Update resume with all new projects', completed: false },
        { task: 'Update GitHub README files', completed: false },
        { task: 'Write blog posts about your learning journey', completed: false },
        { task: 'Update LinkedIn profile', completed: false },
        { task: 'Request recommendations from mentors', completed: false }
      ],
      
      skillsTargeted: ['Personal Branding', 'Communication'],
      completed: false
    };
  }
  
  generateCapstoneProject(gaps, jobRequirements) {
    // Generate project idea based on gaps
    const projectTemplates = {
      'Microservices': {
        title: 'DistroMart - Scalable E-commerce Backend',
        description: 'Build a microservices-based e-commerce platform with separate services for users, products, orders, and payments.',
        techStack: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Redis', 'RabbitMQ', 'Docker', 'Kubernetes', 'AWS'],
        features: [
          'JWT-based authentication',
          'Product catalog with search',
          'Order processing with message queues',
          'Payment gateway integration',
          'Real-time order notifications',
          'Admin dashboard',
          'Load testing with JMeter'
        ],
        estimatedDuration: '3-4 weeks',
        tutorialUrl: 'https://www.youtube.com/watch?v=0agKzfqPppA'
      },
      
      'System Design': {
        title: 'TwitClone - Twitter-like Social Platform',
        description: 'Build a scalable social media platform with real-time feeds and notifications.',
        techStack: ['Node.js', 'React', 'PostgreSQL', 'Redis', 'Socket.io', 'AWS S3', 'Docker'],
        features: [
          'User authentication',
          'Post tweets with media upload',
          'Real-time feed using WebSockets',
          'Follow/unfollow users',
          'Like, retweet, comment',
          'Efficient timeline algorithm',
          'CDN for media delivery'
        ],
        estimatedDuration: '4 weeks',
        tutorialUrl: 'https://www.youtube.com/watch?v=K4TOrB7fR3k'
      }
    };
    
    // Pick relevant project
    if (gaps.includes('Microservices Architecture')) {
      return projectTemplates['Microservices'];
    }
    
    return projectTemplates['System Design'];
  }
}
```

---

### Real-time Progress Tracking

Users can mark tasks as complete, and the system tracks:
- Overall progress percentage
- Current phase
- Achievements earned
- Skill improvement over time

**Achievement System Examples:**
- "First Step!" - Complete first task
- "100 Problems Solved!" - Track LeetCode progress (requires integration)
- "Cloud Certified" - Deploy first app to cloud
- "System Designer" - Complete system design phase

---

---

# Global Technical Stack {#technical-stack}

## Frontend (React + Vite)

### Dependencies
```json
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.0",
    "framer-motion": "^12.33.0",        // For 3D parallax animations
    "gsap": "^3.14.2",                  // Advanced animations
    "lucide-react": "^0.563.0",         // Icons
    "axios": "^1.6.0",                  // API calls
    "react-query": "^3.39.0",           // Data fetching & caching
    "react-hook-form": "^7.48.0",       // Form handling
    "react-dropzone": "^14.2.0",        // File uploads
    "react-hot-toast": "^2.4.0",        // Notifications
    "recharts": "^2.10.0",              // Charts for roadmap
    "marked": "^11.0.0",                // Markdown rendering
    "highlight.js": "^11.9.0"           // Code syntax highlighting
  }
}
```

---

## Backend (Node.js + Express)

### Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^8.0.0",               // MongoDB ODM
    "jsonwebtoken": "^9.0.0",           // Authentication
    "bcrypt": "^5.1.0",                 // Password hashing
    "multer": "^1.4.0",                 // File uploads
    "aws-sdk": "^2.1490.0",             // AWS S3 for storage
    "pdf-parse": "^1.1.1",              // Resume parsing
    "natural": "^6.8.0",                // NLP for text processing
    "octokit": "^3.1.0",                // GitHub API client
    "axios": "^1.6.0",                  // HTTP client
    "dotenv": "^16.3.0",                // Environment variables
    "cors": "^2.8.5",                   // CORS handling
    "helmet": "^7.1.0",                 // Security headers
    "express-rate-limit": "^7.1.0",     // Rate limiting
    "joi": "^17.11.0"                   // Validation
  }
}
```

---

## Database

### MongoDB (for Experience Page & Roadmap)
- Flexible schema for varying experience structures
- Fast querying with indexes
- Good for nested documents (interview rounds, roadmap phases)

### Collections:
- `users` - User accounts
- `experiences` - Interview experiences
- `comments` - Comments on experiences
- `companies` - Master company data
- `roadmaps` - User roadmaps
- `jobTemplates` - Job requirement templates
- `achievements` - User achievements

---

## Cloud Services

### AWS Services:
- **S3** - Store resumes, offer letters, profile images
- **CloudFront** - CDN for static assets
- **Lambda** - Serverless functions for resume parsing
- **API Gateway** - RESTful API endpoint management
- **RDS (optional)** - PostgreSQL for relational data
- **ElastiCache (Redis)** - Caching for frequently accessed data

### Authentication:
- **GitHub OAuth** - For GitHub integration
- **LinkedIn OAuth** - For LinkedIn profile import
- **JWT** - Session management

---

---

# 3D Parallax Implementation Strategy {#parallax-implementation}

## Using Framer Motion

### Example: Hero Section Parallax

```jsx
// components/ExperiencePage/Hero.jsx
import { motion, useScroll, useTransform } from 'framer-motion';

const Hero = () => {
  const { scrollYProgress } = useScroll();
  
  // Transform scroll position to movement values
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const midLayerY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const foregroundY = useTransform(scrollYProgress, [0, 1], ['0%', '10%']);
  
  return (
    <div className="hero-container">
      {/* Background layer (slowest) */}
      <motion.div
        className="hero-background"
        style={{ y: backgroundY }}
      >
        <div className="gradient-mesh"></div>
      </motion.div>
      
      {/* Mid layer (medium speed) */}
      <motion.div
        className="hero-patterns"
        style={{ y: midLayerY }}
      >
        <div className="floating-cards"></div>
      </motion.div>
      
      {/* Foreground (normal speed) */}
      <motion.div
        className="hero-content"
        style={{ y: foregroundY }}
      >
        <h1>REAL STORIES, REAL OFFERS</h1>
        <p>Discover How 10,000+ Students Cracked Their Dream Placements</p>
      </motion.div>
    </div>
  );
};
```

---

### Example: Roadmap Timeline Parallax

```jsx
// components/AimPage/RoadmapTimeline.jsx
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useRef } from 'react';

const RoadmapPhase = ({ phase, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-100px" });
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  // Each phase moves at different speed
  const y = useTransform(scrollYProgress, [0, 1], ['20%', '-20%']);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  
  return (
    <motion.div
      ref={ref}
      className="roadmap-phase"
      style={{
        y,
        rotateX,
        opacity,
        transformPerspective: 1000
      }}
      initial={{ opacity: 0, y: 100 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <h3>{phase.title}</h3>
      <p>{phase.goal}</p>
      {/* Action items, resources, etc. */}
    </motion.div>
  );
};

const RoadmapTimeline = ({ phases }) => {
  return (
    <div className="roadmap-timeline">
      {phases.map((phase, index) => (
        <RoadmapPhase key={phase.phaseNumber} phase={phase} index={index} />
      ))}
    </div>
  );
};
```

---

### CSS for 3D Effects

```css
/* styles/ParallaxEffects.css */

.hero-container {
  position: relative;
  height: 100vh;
  overflow: hidden;
  perspective: 1000px;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 120%;
  z-index: 1;
}

.gradient-mesh {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.3;
}

.hero-patterns {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
}

.hero-content {
  position: relative;
  z-index: 3;
  padding: 100px 50px;
  text-align: center;
}

/* Roadmap 3D Cards */
.roadmap-phase {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px;
  margin: 100px auto;
  max-width: 800px;
  transform-style: preserve-3d;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 80px rgba(102, 126, 234, 0.2);
  transition: transform 0.3s ease;
}

.roadmap-phase:hover {
  transform: translateZ(20px) scale(1.02);
  box-shadow: 
    0 30px 80px rgba(0, 0, 0, 0.4),
    0 0 120px rgba(102, 126, 234, 0.4);
}

/* Floating particles background */
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

.floating-cards {
  position: absolute;
  width: 100%;
  height: 100%;
}

.floating-cards::before,
.floating-cards::after {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  animation: float 10s ease-in-out infinite;
}

.floating-cards::before {
  top: 20%;
  left: 10%;
}

.floating-cards::after {
  bottom: 20%;
  right: 10%;
  animation-delay: -5s;
}
```

---

### Alternative: Using GSAP ScrollTrigger

```javascript
// utils/parallaxAnimations.js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const initParallax = (elementSelector, speed = 0.5) => {
  gsap.to(elementSelector, {
    y: (i, target) => -ScrollTrigger.maxScroll(window) * target.dataset.speed,
    ease: "none",
    scrollTrigger: {
      start: 0,
      end: "max",
      invalidateOnRefresh: true,
      scrub: 0
    }
  });
};

// Usage in component:
// <div data-speed="0.3" className="parallax-bg">...</div>
// useEffect(() => { initParallax('.parallax-bg'); }, []);
```

---

## Performance Optimization Tips

1. **Use `will-change` CSS property** for animated elements
2. **Lazy load images** in experience feed
3. **Virtualize long lists** (react-window/react-virtuoso)
4. **Debounce scroll events** if using custom parallax
5. **Use React.memo** for heavy components
6. **Implement pagination** with infinite scroll
7. **Cache API responses** with React Query

---

---

# Integration Points Between Pages

## Experience Page → Aim Page
- User reads an experience and sees "Get your own roadmap to work at [Company]" CTA
- Click takes them to Aim Page with company/role pre-filled

## Aim Page → Experience Page
- When roadmap is generated, suggest: "Read real experiences from [Company]"
- Link to filtered experience feed

## Both Pages → Experience Radar
- Show author's Experience Radar profile in experiences
- Link roadmap projects to Experience Radar
- Unified skill tracking across all features

## Both Pages → Resume Builder
- Use resume builder to create/update resume for Aim Page
- Use resume builder to highlight experiences for applications

---

---

# Summary

These two pages transform Nexus into a comprehensive career development platform:

1. **Experience Page** provides real, verified interview insights with structured data, replacing messy forums with actionable intelligence.

2. **Aim Page** provides AI-powered, personalized career roadmaps that analyze users' current skills via resume parsing and GitHub analysis, then deliver step-by-step guides to reach their target roles.

Both pages feature modern 3D parallax scrolling for an immersive, engaging user experience that makes career planning feel like an exciting journey rather than a chore.

The backend architecture is scalable, with modular services for resume parsing, GitHub analysis, skill matching, and roadmap generation. The database schemas are flexible yet structured, and the API design supports future enhancements like:
- Real-time collaboration
- Social features (follow users, save experiences)
- Advanced analytics (company placement trends, skill demand forecasting)
- Integration with job boards and applicant tracking systems

---

**Next Steps for Implementation:**
1. Build database schemas and seed with test data
2. Develop API endpoints with authentication
3. Create React components with 3D parallax effects
4. Integrate GitHub OAuth and PDF parsing
5. Build matching engine and roadmap generator logic
6. Test with real user data
7. Deploy and iterate based on feedback
