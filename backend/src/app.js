const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const openRoutes = require('./routes/openRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '512kb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Email link landing pages (no CSP — inline HTML)
app.use('/open', openRoutes);

app.use(helmet());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Centralized error handler (e.g. for middleware calling next(err))
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {})
      .map((e) => e.message)
      .join('; ');
    return res.status(400).json({ message: messages || err.message });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate email or conflicting unique field' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Image is too large. Try a smaller photo.' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;

