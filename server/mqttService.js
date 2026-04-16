const mqtt = require('mqtt');
const Vitals = require('./models/Vitals');
const Threshold = require('./models/Threshold');
const Patient = require('./models/Patient');

const setupMQTT = (io) => {
  const brokerUrl = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com';
  const client = mqtt.connect(brokerUrl);

  client.on('connect', () => {
    console.log(`Connected to MQTT Broker: ${brokerUrl}`);
    // Subscribe to all healtrack topics
    client.subscribe('healtrack/patient/#', (err) => {
      if (!err) {
        console.log('Subscribed to healtrack/patient/#');
      }
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      // Expecting topic: healtrack/patient/{mqttTopic}
      const parts = topic.split('/');
      if (parts.length < 3) return;
      const mqttTopicStr = parts.slice(2).join('/'); // In case topic has slashes

      const patient = await Patient.findOne({ mqttTopic: mqttTopicStr });
      if (!patient) {
        // console.log(`No patient found for topic ${mqttTopicStr}`);
        return;
      }

      const { heartRate, spo2, temperature, ecgStatus, ecgRaw, roomTemperature, humidity } = data;
      
      if (heartRate == null || spo2 == null || temperature == null) {
          return; // invalid payload
      }

      const newVitals = new Vitals({
        patientId: patient._id,
        heartRate,
        spo2,
        temperature,
        roomTemperature: roomTemperature != null ? roomTemperature : 22.0,
        humidity: humidity != null ? humidity : 45.0,
        ecgStatus: ecgStatus || 'normal',
        ecgRaw: ecgRaw || 0
      });

      await newVitals.save();

      // Emit live updates to frontend via Socket.io
      io.emit(`vitalsUpdate_${patient._id}`, newVitals);

      // Check thresholds and alert
      const thresholds = await Threshold.findOne({ patientId: patient._id });
      if (thresholds) {
        let alerts = [];
        if (heartRate < thresholds.heartRate.min) alerts.push(`CRITICAL: Patient ${patient.name}'s Heart Rate dropped to ${heartRate} BPM — Below minimum threshold of ${thresholds.heartRate.min}`);
        else if (heartRate > thresholds.heartRate.max) alerts.push(`WARNING: Patient ${patient.name}'s Heart Rate spiked to ${heartRate} BPM — Above maximum threshold of ${thresholds.heartRate.max}`);
        
        if (spo2 < thresholds.spo2.min) alerts.push(`CRITICAL: Patient ${patient.name}'s SpO2 dropped to ${spo2}% — Below minimum threshold of ${thresholds.spo2.min}%`);
        
        if (temperature < thresholds.temperature.min) alerts.push(`WARNING: Patient ${patient.name}'s Temperature dropped to ${temperature}°C — Below minimum threshold of ${thresholds.temperature.min}°C`);
        else if (temperature > thresholds.temperature.max) alerts.push(`WARNING: Patient ${patient.name}'s Temperature spiked to ${temperature}°C — Above maximum threshold of ${thresholds.temperature.max}°C`);
        
        if (roomTemperature != null && thresholds.roomTemperature) {
           if (roomTemperature < thresholds.roomTemperature.min) alerts.push(`WARNING: Ambient Room Temp dropped to ${roomTemperature}°C — Below target ${thresholds.roomTemperature.min}°C`);
           else if (roomTemperature > thresholds.roomTemperature.max) alerts.push(`WARNING: Ambient Room Temp hit ${roomTemperature}°C — Above target ${thresholds.roomTemperature.max}°C`);
        }
        if (humidity != null && thresholds.humidity) {
           if (humidity < thresholds.humidity.min) alerts.push(`WARNING: Room Humidity dropped to ${humidity}% — Too dry`);
           else if (humidity > thresholds.humidity.max) alerts.push(`WARNING: Room Humidity hit ${humidity}% — Too humid`);
        }
        
        if (alerts.length > 0) {
          io.emit(`vitalsAlert_${patient._id}`, { alerts, vitals: newVitals });
        }
      }

    } catch (err) {
      // JSON parse error or db error
      // console.error('MQTT Message Processing Error:', err.message);
    }
  });

  client.on('error', (err) => {
    console.error('MQTT Connection Error:', err);
  });
};

module.exports = setupMQTT;
