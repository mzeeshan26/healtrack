const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Vitals = require('../models/Vitals');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { message, mode, patientId } = req.body;

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  if (!geminiKey || geminiKey === 'your_openai_api_key_here') {
    return res.status(500).json({ message: 'Gemini API key not configured' });
  }

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const formatRules =
    'Always format your entire reply in Markdown that will render in a chat UI: use ## for each main section heading (not plain text in asterisks), **bold** for key labels and emphasis, short bullet lists with - for points, and blank lines between sections. Never use single-asterisk pseudo-headings like *Section*; use real ## headings instead.';

  let systemPrompt =
    `You are a helpful and knowledgeable Medical Assistant. Keep your answers concise and professional. ${formatRules} `;

  if (mode === 'patient_data' && patientId) {
    try {
      const patient = await Patient.findById(patientId);
      const latestVitals = await Vitals.findOne({ patientId }).sort({ timestamp: -1 });

      if (patient && latestVitals) {
        systemPrompt = `You are a medical data analysis assistant. You are currently looking at the live ICU dashboard for patient ${patient.name}, a ${patient.age}-year-old ${patient.gender} admitted for ${patient.condition}.

Current vitals (as of ${new Date(latestVitals.timestamp).toLocaleString()}):
- Heart Rate: ${latestVitals.heartRate} BPM
- SpO2: ${latestVitals.spo2}%
- Body Temperature: ${latestVitals.temperature}°C
- ECG Status: ${latestVitals.ecgStatus}

Answer the user's questions based on this data. Analyze the current vitals and provide professional, concise insights. ${formatRules}`;
      } else {
        systemPrompt += ' Note: No patient data is currently available.';
      }
    } catch (err) {
      console.error('Error fetching patient context for chat', err);
    }
  }

  try {
    const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
    const reply = result.response.text();
    res.json({ reply });
  } catch (err) {
    console.error('Gemini API Error', err);
    res.status(500).json({ message: 'Failed to generate response', error: err.message });
  }
});

module.exports = router;
