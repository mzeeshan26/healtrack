const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const Vitals = require('../models/Vitals');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { message, mode, patientId } = req.body;

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    return res.status(500).json({ message: 'OpenAI API key not configured' });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let systemPrompt = "You are a helpful and knowledgeable Medical Assistant.";

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

Please answer the user's questions based on this data. If they ask about the patient's condition, analyze the current vitals and provide professional, concise insights. Keep your answers brief and readable.`;
      } else {
        systemPrompt += " Note: No patient data is currently available.";
      }
    } catch (err) {
      console.error('Error fetching patient context for chat', err);
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      model: "gpt-3.5-turbo",
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error('OpenAI API Error', err);
    res.status(500).json({ message: 'Failed to generate response', error: err.message });
  }
});

module.exports = router;
