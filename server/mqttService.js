const mqtt = require('mqtt');
const Vitals = require('./models/Vitals');
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

      // Emit live updates to frontend via Socket.io (UI uses color coding vs thresholds)
      io.emit(`vitalsUpdate_${patient._id}`, newVitals);

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
