// OTP generation utility
// Firebase handles actual SMS delivery — this file only generates the 6-digit code
// and provides a dev-mode fallback for local testing without Firebase.

// const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // sendOTP is kept for dev mode logging only.
// // In production, Firebase (frontend) sends the OTP directly.
// const sendOTP = async (mobile, otp) => {
//   if (process.env.NODE_ENV !== 'production') {
//     console.log(`📱 [DEV] OTP for ${mobile}: ${otp}`);
//     return {
//       success: true,
//       message: `OTP sent to ${mobile}`,
//       devOtp: otp
//     };
//   }
//   // In production this function is not called —
//   // Firebase on the frontend handles SMS delivery.
//   return { success: true, message: `OTP sent to ${mobile}` };
// };

// const getOTPExpiry = () => {
//   const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
//   return new Date(Date.now() + minutes * 60 * 1000);
// };

// module.exports = { generateOTP, sendOTP, getOTPExpiry };
