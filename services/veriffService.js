import crypto from 'crypto';
import fetch from 'node-fetch';
import https from 'https';

class VeriffService {
  constructor() {
    this.apiKey = process.env.VERIFF_API_KEY;
    this.sharedSecret = process.env.VERIFF_SHARED_SECRET;
    this.baseUrl = process.env.VERIFF_BASE_URL || 'https://stationapi.veriff.com';
  }

  /**
   * Generate HMAC signature for Veriff API authentication
   */
  generateSignature(payload, timestamp) {
    if (!this.sharedSecret) {
      throw new Error('VERIFF_SHARED_SECRET is not defined');
    }
    
    // Veriff expects the signature to be generated from the raw payload
    // without the timestamp prefix
    return crypto
      .createHmac('sha256', this.sharedSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Create a verification session
   */
  async createVerificationSession(userData) {
    try {
      const timestamp = new Date().toISOString();
      const payload = JSON.stringify({
        verification: {
          person: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            dateOfBirth: userData.dateOfBirth, // Format: YYYY-MM-DD
          },
          document: {
            type: 'PASSPORT', // or 'ID_CARD', 'DRIVERS_LICENSE'
            country: userData.country || 'US',
          },
          vendorData: userData.userId.toString(),
          lang: 'en',
          // Remove timestamp from payload - it should be in headers
        },
      });

      const signature = this.generateSignature(payload, timestamp);

      // Create HTTPS agent that ignores self-signed certificates (for development)
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });

      const response = await fetch(`${this.baseUrl}/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-CLIENT': this.apiKey,
          'X-HMAC-SIGNATURE': signature,
          'X-TIMESTAMP': timestamp,
        },
        body: payload,
        agent: httpsAgent,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Veriff API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        sessionId: result.verification.id,
        sessionUrl: result.verification.url,
        sessionToken: result.verification.sessionToken,
      };
    } catch (error) {
      console.error('Veriff session creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create verification session',
      };
    }
  }

  /**
   * Get verification session status
   */
  async getVerificationStatus(sessionId) {
    try {
      const timestamp = Date.now().toString();
      const payload = '';
      const signature = this.generateSignature(payload, timestamp);

      const response = await fetch(`${this.baseUrl}/v1/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': this.apiKey,
          'X-HMAC-SIGNATURE': signature,
          'X-TIMESTAMP': timestamp,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Veriff API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        status: result.verification.status,
        code: result.verification.code,
        reason: result.verification.reason,
        person: result.verification.person,
        document: result.verification.document,
      };
    } catch (error) {
      console.error('Veriff status check error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get verification status',
      };
    }
  }

  /**
   * Handle webhook verification
   */
  verifyWebhookSignature(payload, signature, timestamp) {
    try {
      const expectedSignature = this.generateSignature(payload, timestamp);
      return signature === expectedSignature;
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Map Veriff status codes to our internal status
   */
  mapVeriffStatusToOurStatus(action, code) {
    // Veriff status codes: https://developers.veriff.com/#webhook-events
    switch (code) {
      case 7001:
        return 'STARTED'; // Verification session started
      case 7002:
        return 'SUBMITTED'; // Documents submitted for review
      case 9001:
        return 'APPROVED'; // Verification approved
      case 9002:
        return 'DECLINED'; // Verification declined
      case 9003:
        return 'RESUBMISSION_REQUESTED'; // Resubmission requested
      case 9004:
        return 'EXPIRED'; // Session expired
      case 9005:
        return 'ABANDONED'; // Session abandoned
      default:
        return action ? action.toUpperCase() : 'UNKNOWN';
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(eventData) {
    try {
      console.log('🔍 Processing webhook data:', JSON.stringify(eventData, null, 2));
      
      // Handle different webhook structures
      let verification = eventData.verification || eventData;
      
      console.log('📋 Verification data:', JSON.stringify(verification, null, 2));
      
      // Extract session ID from different possible locations
      let sessionId = verification?.id || verification?.sessionId || eventData?.id;
      let action = verification?.action;
      let code = verification?.code || verification?.decision?.code;
      
      // Map Veriff codes and actions to our status
      let status = this.mapVeriffStatusToOurStatus(action, code);
      
      console.log('📊 Extracted data:', {
        sessionId,
        action,
        code,
        status,
        reason: verification?.reason,
      });
      
      return {
        success: true,
        sessionId: sessionId,
        status: status,
        code: code,
        reason: verification?.reason,
        person: verification?.person,
        document: verification?.document,
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      console.error('Event data was:', JSON.stringify(eventData, null, 2));
      return {
        success: false,
        error: error.message || 'Failed to process webhook event',
      };
    }
  }
}

export default VeriffService;
