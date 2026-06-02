/**
 * Seeds a verified user for Playwright auth E2E. Prints JSON credentials to stdout.
 * Usage: MONGO_URI=... node scripts/e2e-seed.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EMAIL = process.env.E2E_EMAIL || 'e2e@pomodoria.test';
const PASSWORD = process.env.E2E_PASSWORD || 'E2eTestUser123!';
const NAME = process.env.E2E_NAME || 'E2E User';

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pomodoria';
  await mongoose.connect(uri);

  const User = require('../src/models/User');
  const Settings = require('../src/models/Settings');

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(PASSWORD, salt);

  let user = await User.findOne({ email: EMAIL.toLowerCase() });
  if (!user) {
    user = await User.create({
      name: NAME,
      email: EMAIL.toLowerCase(),
      password: hashedPassword,
      emailVerified: true,
    });
    await Settings.create({ userId: user._id });
  } else {
    user.name = NAME;
    user.password = hashedPassword;
    user.emailVerified = true;
    await user.save();
    const settings = await Settings.findOne({ userId: user._id });
    if (!settings) {
      await Settings.create({ userId: user._id });
    }
  }

  await mongoose.disconnect();
  process.stdout.write(JSON.stringify({ email: EMAIL, password: PASSWORD, name: NAME }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
