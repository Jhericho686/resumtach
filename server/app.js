const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Routes
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicantRoutes = require('./routes/applicantRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Middleware
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  frameguard: false // Allow embedding in iframes/embeds (e.g. for PDF preview)
}));

// Tightened CORS Policy
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://resumatchvc3.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || 
                      (origin.endsWith('.vercel.app') && origin.includes('resumatch'));
    if (isAllowed || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
}));

// Rate Limiting (Brute-force and DDoS protection)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve uploaded resumes statically with cross-origin access allowed, blocking dotfiles and indexing
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir, {
  dotfiles: 'deny',
  index: false,
  maxAge: '1d'
}));

// API Routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/jobs', jobRoutes);
apiRouter.use('/applicants', applicantRoutes);
apiRouter.use('/resumes', resumeRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/activity-logs', activityLogRoutes);
apiRouter.use('/notifications', notificationRoutes);

app.use('/api', apiRouter);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ResuMatch API' });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
