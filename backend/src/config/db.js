const mongoose = require('mongoose');

// Connect to MongoDB using mongoose
// Expects MONGO_URI in environment variables
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);

    const { host, name } = mongoose.connection;
    console.log(`[DB] Connected to MongoDB — host: ${host}, database: ${name}`);
  } catch (error) {
    console.error('[DB] Connection failed:', error.message || error);
    if (error.stack) console.error(error.stack);
    throw error;
  }
};

module.exports = connectDB;

