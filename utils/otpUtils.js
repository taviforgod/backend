const otps = {}; // Replace with DB in production

export const sendOTP = async (userId, phone) => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otps[userId] = { code, expires: Date.now() + 10 * 60 * 1000 };
  // Integrate SMS API here
  // Example: Log OTP to console for development/testing
  console.log(`OTP for user ${userId} (${phone}): ${code}`);
};

export const verifyOTP = async (userId, code) => {
  if (!otps[userId]) return false;
  const valid = otps[userId].code === code;
  if (valid) delete otps[userId];
  return valid;
};