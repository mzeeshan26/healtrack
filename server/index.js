require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const setupMQTT = require('./mqttService');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible in routes if needed
app.set('socketio', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/vitals', require('./routes/vitals'));
app.use('/api/thresholds', require('./routes/thresholds'));
app.use('/api/chat', require('./routes/chat'));

// Database connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI === 'your_mongodb_uri_here') {
       console.log('Using in-memory mock or failing... MONGODB_URI not set properly.');
       // For a real scenario, this would fail. We'll attempt anyway.
    }
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healtrack');
    console.log('MongoDB Connected');
    
    // Seed Superadmin / Doctor
    const doctorExists = await User.findOne({ role: 'doctor' });
    if (!doctorExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('doctor123!', salt);
      const doctor = new User({
        name: 'Dr. Admin',
        email: 'doctor@healtrack.com',
        password: hashedPassword,
        role: 'doctor'
      });
      await doctor.save();
      console.log('Seeded initial Doctor account: doctor@healtrack.com / doctor123!');
    }
    
    // Initialize MQTT and pass socket.io instance
    setupMQTT(io);

  } catch (err) {
    console.error('Database connection error:', err);
  }
};

connectDB();

io.on('connection', (socket) => {
  console.log('New client connected via Socket.IO');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
