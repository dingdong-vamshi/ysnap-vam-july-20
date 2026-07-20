const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY before running this test.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

const artifactsDir = process.env.ELEVENLABS_E2E_ARTIFACTS_DIR || path.join(process.cwd(), 'tmp', 'elevenlabs-e2e');

// Create artifacts dir if not exists
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

async function runTest() {
  console.log('--- STARTING ELEVENLABS E2E TEST ---');
  const email = process.env.ELEVENLABS_E2E_EMAIL;
  const password = process.env.ELEVENLABS_E2E_PASSWORD;

  if (!email || !password) {
    throw new Error('Set ELEVENLABS_E2E_EMAIL and ELEVENLABS_E2E_PASSWORD before running this test.');
  }

  console.log('Skipping sign up (pre-inserted direct SQL test user)...');

  console.log('3. Signing in to retrieve valid JWT session...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Sign in failed (user might not be confirmed yet):', signInError.message);
    return;
  }

  const token = signInData.session.access_token;
  console.log('JWT Token successfully retrieved.');

  // A. VOICE LIST TEST
  console.log('A. Testing list-voices Edge Function...');
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/list-voices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const resText = await res.text();
    console.log('list-voices status:', res.status);
    console.log('list-voices body:', resText);
    
    fs.writeFileSync(
      path.join(artifactsDir, 'elevenlabs_voice_list.json'),
      resText
    );
  } catch (err) {
    console.error('list-voices failed:', err.message);
  }

  // C. TRANSLATION TEST
  const originalText = 'The silver bicycle is parked beside the library.';
  console.log(`C. Testing translate-text Edge Function for sentence: "${originalText}"...`);
  let translatedText = '';
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/translate-text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'en',
        target: 'es',
        text: originalText,
      })
    });

    const resText = await res.text();
    console.log('translate-text status:', res.status);
    console.log('translate-text body:', resText);

    if (res.status === 200) {
      const parsed = JSON.parse(resText);
      translatedText = parsed.translated_text;
    }
    
    fs.writeFileSync(
      path.join(artifactsDir, 'real_translation_output.json'),
      resText
    );
  } catch (err) {
    console.error('translate-text failed:', err.message);
  }

  // D. TEXT-TO-SPEECH TEST
  if (translatedText) {
    console.log(`D. Testing generate-speech Edge Function with text: "${translatedText}"...`);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: translatedText,
          voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
          saveToStorage: true,
        })
      });

      const resText = await res.text();
      console.log('generate-speech status:', res.status);
      console.log('generate-speech body:', resText);

      fs.writeFileSync(
        path.join(artifactsDir, 'elevenlabs_tts_output.json'),
        resText
      );
    } catch (err) {
      console.error('generate-speech failed:', err.message);
    }
  }

  console.log('--- ELEVENLABS E2E TEST COMPLETED ---');
}

runTest();
