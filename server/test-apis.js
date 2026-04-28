// Test script to compare both APIs
// Run this in your server to see which works better

const fetch = require('node-fetch');

const testResume = `
ANA M. SMITH
Chemical Engineer
Miami, FL | anamsmith2333@gmail.com | 655-985-9856 | linkedin.com/ana-m-smith

PROFESSIONAL SUMMARY
Dynamic Chemical Engineer with over a decade of experience in the pharmaceutical sector, specializing in client-focused services and robust relationship management.

TECHNICAL PROFILE
- Process Design & Optimization
- Regulatory Compliance
- Laboratory Management
`;

// Test 1: Google Gemini API
async function testGemini(apiKey) {
  console.log('\n🤖 Testing Google Gemini API...');
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Optimize this resume bullet point using STAR method: "${testResume.split('\n')[8]}")`
          }]
        }],
        generationConfig: { maxOutputTokens: 200 }
      })
    });
    const data = await response.json();
    console.log('✅ Gemini Response:', data.candidates[0]?.content?.parts[0]?.text?.substring(0, 100) + '...');
    return { success: true, api: 'Gemini' };
  } catch (err) {
    console.log('❌ Gemini Error:', err.message);
    return { success: false, api: 'Gemini' };
  }
}

// Test 2: RapidAPI Resume Optimizer
async function testResumeOptimizer(apiKey) {
  console.log('\n📋 Testing Resume Optimizer Pro API...');
  try {
    const response = await fetch('https://resumeoptimizerpro.p.rapidapi.com/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'resumeoptimizerpro.p.rapidapi.com'
      },
      body: JSON.stringify({
        ResumeText: testResume,
        FileName: 'test-resume.txt'
      })
    });
    const data = await response.json();
    console.log('✅ Resume Optimizer Response:', JSON.stringify(data).substring(0, 100) + '...');
    return { success: true, api: 'ResumeOptimizer', data };
  } catch (err) {
    console.log('❌ Resume Optimizer Error:', err.message);
    return { success: false, api: 'ResumeOptimizer' };
  }
}

// Run tests
async function runTests() {
  console.log('=== API Comparison Tests ===\n');
  
  const geminiKey = process.env.GEMINI_API_KEY;
  const rapidKey = 'f72c08e868msha6d0859745b2ba1p10a505jsnf7d16b32e4d1';
  
  if (!geminiKey) console.log('⚠️  GEMINI_API_KEY not set');
  
  const results = [];
  if (geminiKey) results.push(await testGemini(geminiKey));
  results.push(await testResumeOptimizer(rapidKey));
  
  console.log('\n=== Summary ===');
  results.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.api}`);
  });
}

// Export for use
module.exports = { testGemini, testResumeOptimizer, runTests };

// Run if called directly
if (require.main === module) {
  runTests();
}
