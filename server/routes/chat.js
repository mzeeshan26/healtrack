const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Vitals = require('../models/Vitals');
const Patient = require('../models/Patient');
const ClinicalInsight = require('../models/ClinicalInsight');
const auth = require('../middleware/auth');
const { getPatientTrackerState } = require('../services/clinicalInference');
const { getBadgeLabel } = require('../services/abnormalityTracker');

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_FALLBACKS = ['gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];

function isQuotaOrRateLimitError(err) {
  const msg = err?.message || '';
  return err?.status === 429 || /quota|rate limit|too many requests|429/i.test(msg);
}

function parseRetryMs(err) {
  const match = (err?.message || '').match(/retry in ([\d.]+)s/i);
  if (match) return Math.min(Math.ceil(parseFloat(match[1]) * 1000) + 500, 20000);
  return 8000;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModelList() {
  const primary = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  const fallbacks = (process.env.GEMINI_MODEL_FALLBACKS || DEFAULT_FALLBACKS.join(','))
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
}

async function generateReply(genAI, models, prompt) {
  let lastError;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      let result;

      try {
        result = await model.generateContent(prompt);
      } catch (err) {
        if (isQuotaOrRateLimitError(err)) {
          await sleep(parseRetryMs(err));
          result = await model.generateContent(prompt);
        } else {
          throw err;
        }
      }

      const response = result.response;
      const reply = response.text?.() ?? response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        return { reply, modelUsed: modelName };
      }
    } catch (err) {
      lastError = err;
      if (isQuotaOrRateLimitError(err)) {
        console.warn(`[chat] Model ${modelName} quota/rate limited — trying next model.`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

function mapGeminiError(err) {
  const errText = err?.message || String(err);

  if (isQuotaOrRateLimitError(err)) {
    return {
      status: 429,
      message:
        'Gemini free-tier quota is exhausted for your Google project (often after a leaked key or heavy testing). ' +
        'Wait and retry later, create a new API key in a fresh Google AI Studio project, enable billing, or set GEMINI_MODEL=gemini-2.5-flash (or gemini-1.5-flash) in server/.env and restart the server.',
    };
  }
  if (/leaked|reported as leaked/i.test(errText)) {
    return {
      status: 403,
      message:
        'Gemini API key was revoked. Create a new key at Google AI Studio and update GEMINI_API_KEY in server/.env.',
    };
  }
  if (/API key not valid|invalid api key|401|403/i.test(errText)) {
    return {
      status: 403,
      message: 'Invalid Gemini API key. Check GEMINI_API_KEY in server/.env.',
    };
  }
  if (/not found|404/i.test(errText)) {
    return {
      status: 400,
      message: 'Gemini model not found. Try GEMINI_MODEL=gemini-2.5-flash in server/.env.',
    };
  }

  return {
    status: 500,
    message: 'Failed to generate response. Please try again in a moment.',
  };
}

router.post('/', auth, async (req, res) => {
  const { message, mode, patientId } = req.body;

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  const placeholderKeys = new Set(['', 'your_openai_api_key_here', 'your_gemini_api_key_here']);
  if (!geminiKey || placeholderKeys.has(geminiKey)) {
    return res.status(500).json({
      message:
        geminiKey === 'your_gemini_api_key_here'
          ? 'GEMINI_API_KEY is still the placeholder in server/.env. Paste your key, save (Ctrl+S), then restart the server.'
          : 'Gemini API key not configured. Add GEMINI_API_KEY to server/.env and restart the server.',
    });
  }

  const models = getModelList();
  const genAI = new GoogleGenerativeAI(geminiKey);

  const formatRules =
    'Always format your entire reply in Markdown that will render in a chat UI: use ## for each main section heading (not plain text in asterisks), **bold** for key labels and emphasis, short bullet lists with - for points, and blank lines between sections. Never use single-asterisk pseudo-headings like *Section*; use real ## headings instead.';

  let systemPrompt =
    `You are a helpful and knowledgeable Medical Assistant. Keep your answers concise and professional. ${formatRules} `;

  if (mode === 'patient_data' && patientId) {
    try {
      const patient = await Patient.findById(patientId);
      const latestVitals = await Vitals.findOne({ patientId }).sort({ timestamp: -1 });

      if (patient && latestVitals) {
        const tracker = getPatientTrackerState(patientId);
        const activeSignals = Object.entries(tracker.vitals)
          .filter(([, t]) => t.phase === 'warning' || t.phase === 'critical')
          .map(([k, t]) => `${k}: ${getBadgeLabel(t) || t.phase}`)
          .join('; ');
        const recentInsights = await ClinicalInsight.find({ patientId })
          .sort({ timestamp: -1 })
          .limit(5);
        const insightLines = recentInsights.map((i) => `- ${i.label} (${i.severity})`).join('\n');

        systemPrompt = `You are a medical data analysis assistant. You are currently looking at the live ICU dashboard for patient ${patient.name}, a ${patient.age}-year-old ${patient.gender} admitted for ${patient.condition}.

Current vitals (as of ${new Date(latestVitals.timestamp).toLocaleString()}):
- Heart Rate: ${latestVitals.heartRate} BPM
- SpO2: ${latestVitals.spo2}%
- Body Temperature: ${latestVitals.temperature}°C
- ECG Status: ${latestVitals.ecgStatus}

Rule-based clinical inference (noise-filtered, not diagnostic):
${activeSignals || 'No confirmed alerts'}
${insightLines ? `Recent composite insights:\n${insightLines}` : ''}

Answer using this data and active clinical signals. ${formatRules}`;
      } else {
        systemPrompt += ' Note: No patient data is currently available.';
      }
    } catch (err) {
      console.error('Error fetching patient context for chat', err);
    }
  }

  const prompt = `${systemPrompt}\n\nUser: ${message}`;

  try {
    const { reply, modelUsed } = await generateReply(genAI, models, prompt);
    if (modelUsed !== models[0]) {
      console.log(`[chat] Used fallback model: ${modelUsed}`);
    }
    res.json({ reply });
  } catch (err) {
    console.error('Gemini API Error', err.message || err);
    const { status, message } = mapGeminiError(err);
    res.status(status).json({ message });
  }
});

module.exports = router;
