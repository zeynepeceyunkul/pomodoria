require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;
/** Bind all interfaces so a physical device on Wi‑Fi can reach the API (Expo Go). */
const HOST = process.env.HOST || '0.0.0.0';

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled promise rejection:', promise);
  console.error('[FATAL] Reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `[SERVER] Port ${PORT} is already in use (EADDRINUSE). Another backend instance may still be running.`,
        );
        console.error('[SERVER] On Windows: Get-NetTCPConnection -LocalPort 5000 | Select OwningProcess');
      } else {
        console.error('[SERVER] HTTP server error:', err.message);
      }
      process.exit(1);
    });

    server.listen(PORT, HOST, () => {
      const { getApiPublicUrl, getPublicAppUrl } = require('./utils/publicUrls');
      console.log(`[SERVER] Listening on http://${HOST}:${PORT}`);
      console.log(`[SERVER] Health check: GET http://127.0.0.1:${PORT}/health`);
      console.log(`[SERVER] Email open links base: ${getApiPublicUrl()}/open/...`);
      console.log(`[SERVER] Web app URL (APP_PUBLIC_URL): ${getPublicAppUrl()}`);
    });

    const shutdown = (signal) => {
      console.log(`[SERVER] ${signal} received — closing HTTP server`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 5000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[SERVER] Failed to start — exiting:', error.message || error);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
};

startServer().catch((err) => {
  console.error('[SERVER] Fatal startup error:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

