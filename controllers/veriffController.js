import VeriffServiceClass from '../services/veriffService.js';
import { User } from '../models/index.js';

// Lazy initialization - only create instance when needed
let VeriffService = null;

function getVeriffService() {
  if (!VeriffService) {
    VeriffService = new VeriffServiceClass();
  }
  return VeriffService;
}

/**
 * Create a new verification session
 */
export const createVerificationSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, dateOfBirth, country } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, and date of birth are required'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth)) {
      return res.status(400).json({
        success: false,
        error: 'Date of birth must be in YYYY-MM-DD format'
      });
    }

    // Get user data
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Create verification session
    const result = await getVeriffService().createVerificationSession({
      userId,
      firstName,
      lastName,
      dateOfBirth,
      country: country || 'US',
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Verification session created successfully',
        sessionId: result.sessionId,
        sessionUrl: result.sessionUrl,
        sessionToken: result.sessionToken,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Create verification session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get verification status
 */
export const getVerificationStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const result = await getVeriffService().getVerificationStatus(sessionId);

    if (result.success) {
      res.status(200).json({
        success: true,
        status: result.status,
        code: result.code,
        reason: result.reason,
        person: result.person,
        document: result.document,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Handle Veriff webhook
 */
export const handleWebhook = async (req, res) => {
  try {
    console.log('📥 Received Veriff webhook');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const signature = req.headers['x-hmac-signature'];
    const timestamp = req.headers['x-timestamp'];
    const payload = JSON.stringify(req.body);

    // Skip signature verification for now to debug the webhook data
    console.log('⏭️ Skipping signature verification for debugging');
    
    // Process webhook event
    console.log('🔄 Processing webhook event...');
    const result = await getVeriffService().processWebhookEvent(req.body);

    console.log('✅ Webhook processing result:', result);
    
    if (result.success) {
      // Update user verification status based on result
      const { sessionId, status, code, action } = result;
      
      console.log('🔍 Looking for user to update...');
      
      // Find user by session ID (you might need to store session-user mapping)
      // For now, we'll extract user ID from vendorData
      const vendorData = req.body.vendorData;
      console.log('📋 Vendor data:', vendorData);
      
      if (vendorData && vendorData !== 'test' && vendorData !== 'user-verification') {
        const userId = vendorData; // vendorData is already a UUID string
        console.log('🔍 Looking for user ID:', userId);
        
        // Validate UUID format (basic check)
        if (userId && typeof userId === 'string' && userId.length > 10) {
          const user = await User.findByPk(userId);
          
          if (user) {
            console.log('👤 Found user:', user.email);
            
            // Update user verification status
            let verificationCode = 'PENDING';
            
            if (status === 'APPROVED') {
              verificationCode = 'VERIFIED';
            } else if (status === 'DECLINED') {
              verificationCode = 'DECLINED';
            } else if (status === 'SUBMITTED') {
              verificationCode = 'UNDER_REVIEW';
            }

            await user.update({
              verification_status: status,
              verification_code: verificationCode,
              verification_date: new Date(),
            });

            console.log(`✅ User ${user.email} verification status updated to ${status} (${verificationCode})`);
          } else {
            console.log(`❌ User not found for ID: ${userId}`);
          }
        } else {
          console.log('❌ Invalid user ID in vendorData');
        }
      } else {
        console.log('⏭️ Test verification or no user ID, skipping user update');
      }

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get user verification status
 */
export const getUserVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'is_verified', 'verification_status', 'verification_code', 'verification_date']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      verification: {
        isVerified: user.verification_status === 'APPROVED' && user.verification_code === 'VERIFIED',
        status: user.verification_status,
        code: user.verification_code,
        date: user.verification_date,
      }
    });
  } catch (error) {
    console.error('Get user verification status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
