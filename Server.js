// Main server setup for backend
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const facultiesRoutes = require('./routes/faculties');
const studentsRoutes = require('./routes/students');
const semestersRoutes = require('./routes/semesters');
const sittingRoutes = require('./routes/sitting');
const compression = require('compression');
const NodeCache = require('node-cache');
const Redis = require('redis');

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://examination-omega.vercel.app',
    'https://student-portal-seven-bay.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(compression());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/faculties', facultiesRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/semesters', semestersRoutes);
app.use('/api/sitting', sittingRoutes);

// Example: In-memory cache for GET /api/sitting
const sittingCache = new NodeCache({ stdTTL: 60 }); // 60 seconds TTL

app.use('/api/sitting', async (req, res, next) => {
  if (req.method === 'GET') {
    const cached = sittingCache.get('sitting');
    if (cached) return res.json(cached);
    // Capture res.json to cache the result
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      sittingCache.set('sitting', data);
      return originalJson(data);
    };
  }
  next();
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI,
      { useNewUrlParser: true, useUnifiedTopology: true }
    )
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Example: Redis client setup (optional, for distributed cache)
// const redisClient = Redis.createClient({ url: process.env.REDIS_URL });
// redisClient.connect().catch(console.error);
// Use redisClient for advanced caching if needed
