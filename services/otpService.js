import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import { Otp, sequelize } from '../models/index.js';

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class OtpService {
  /**
   * Generate a 6-digit OTP code
   */
  static generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Create expiration time (10 minutes from now)
   */
  static getExpirationTime() {
    return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Send OTP email using SendGrid
   */
  static async sendOtpEmail(email, otpCode) {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@jobplatform.com',
      subject: 'Verify Your Email - Job Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Job Platform</h1>
          </div>
          
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">Email Verification</h2>
            <p style="color: #64748b; font-size: 16px; line-height: 1.5;">
              Thank you for registering with Job Platform! To complete your registration, 
              please use the following verification code:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background-color: #2563eb; color: white; 
                          padding: 15px 30px; border-radius: 6px; font-size: 24px; 
                          font-weight: bold; letter-spacing: 3px;">
                ${otpCode}
              </div>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
              This code will expire in 10 minutes. If you didn't request this verification, 
              please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #94a3b8; font-size: 12px;">
            <p>© 2024 Job Platform. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
        Job Platform - Email Verification
        
        Thank you for registering with Job Platform! 
        
        Your verification code is: ${otpCode}
        
        This code will expire in 10 minutes.
        
        If you didn't request this verification, please ignore this email.
        
        © 2024 Job Platform. All rights reserved.
      `
    };

    try {
      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error('SendGrid error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send email' 
      };
    }
  }

  /**
   * Create and send OTP
   */
  static async createAndSendOtp(email) {
    try {
      // Check if there's an existing unused OTP for this email
      const existingOtp = await Otp.findOne({
        where: {
          email: email,
          is_used: false,
          expires_at: {
            [sequelize.Sequelize.Op.gt]: new Date()
          }
        }
      });

      if (existingOtp) {
        // Update attempts if OTP exists
        await existingOtp.update({ attempts: existingOtp.attempts + 1 });
        
        // If too many attempts, don't send new OTP
        if (existingOtp.attempts >= 3) {
          return {
            success: false,
            error: 'Too many OTP requests. Please wait before requesting a new one.'
          };
        }
      }

      // Generate new OTP
      const otpCode = this.generateOtp();
      const expiresAt = this.getExpirationTime();

      // Mark existing OTPs as used
      await Otp.update(
        { is_used: true },
        {
          where: {
            email: email,
            is_used: false
          }
        }
      );

      // Create new OTP record
      const otpRecord = await Otp.create({
        email: email,
        otp_code: otpCode,
        expires_at: expiresAt,
        is_used: false,
        attempts: 0
      });

      // Send email
      const emailResult = await this.sendOtpEmail(email, otpCode);
      
      if (emailResult.success) {
        return {
          success: true,
          message: 'OTP sent successfully',
          expiresAt: expiresAt
        };
      } else {
        // Delete the OTP record if email failed
        await otpRecord.destroy();
        return {
          success: false,
          error: emailResult.error
        };
      }
    } catch (error) {
      console.error('OTP creation error:', error);
      return {
        success: false,
        error: 'Failed to create and send OTP'
      };
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOtp(email, otpCode) {
    try {
      const otpRecord = await Otp.findOne({
        where: {
          email: email,
          otp_code: otpCode,
          is_used: false
        }
      });

      if (!otpRecord) {
        return {
          success: false,
          error: 'Invalid OTP code'
        };
      }

      // Check if OTP is expired
      if (new Date() > otpRecord.expires_at) {
        await otpRecord.update({ is_used: true });
        return {
          success: false,
          error: 'OTP code has expired'
        };
      }

      // Mark OTP as used
      await otpRecord.update({ is_used: true });

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        error: 'Failed to verify OTP'
      };
    }
  }

  /**
   * Clean up expired OTPs
   */
  static async cleanupExpiredOtps() {
    try {
      const deletedCount = await Otp.destroy({
        where: {
          expires_at: {
            [sequelize.Sequelize.Op.lt]: new Date()
          }
        }
      });
      
      console.log(`Cleaned up ${deletedCount} expired OTPs`);
      return deletedCount;
    } catch (error) {
      console.error('OTP cleanup error:', error);
      return 0;
    }
  }
}

export default OtpService;
