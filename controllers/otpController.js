import OtpService from '../services/otpService.js';
import { User } from '../models/index.js';

/**
 * Send OTP to email for verification
 */
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if email format is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Send OTP
    const result = await OtpService.createAndSendOtp(email);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your email',
        expiresAt: result.expiresAt
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Verify OTP code
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP code are required'
      });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be a 6-digit number'
      });
    }

    // Verify OTP
    const result = await OtpService.verifyOtp(email, otp);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'OTP verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Resend OTP
 */
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Send new OTP
    const result = await OtpService.createAndSendOtp(email);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'New OTP sent successfully to your email',
        expiresAt: result.expiresAt
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Clean up expired OTPs (admin endpoint)
 */
const cleanupExpiredOtps = async (req, res) => {
  try {
    const deletedCount = await OtpService.cleanupExpiredOtps();
    
    res.status(200).json({
      success: true,
      message: `Cleaned up ${deletedCount} expired OTPs`
    });
  } catch (error) {
    console.error('Cleanup OTPs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export {
  sendOtp,
  verifyOtp,
  resendOtp,
  cleanupExpiredOtps
};
