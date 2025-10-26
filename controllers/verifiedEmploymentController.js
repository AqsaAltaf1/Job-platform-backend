import crypto from 'crypto';
import { VerifiedEmployment, CandidateProfile, User, Notification } from '../models/index.js';
import { Op } from 'sequelize';
import { sendEmail } from '../utils/emailService.js';

const REVIEW_TOKEN_TTL_HOURS = 168; // 7 days

export const createVerifiedEmployment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user.role !== 'candidate') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const candidateProfileId = req.user.candidateProfile?.id;
    if (!candidateProfileId) {
      return res.status(400).json({ success: false, error: 'Candidate profile not found' });
    }

    const {
      company_name,
      title,
      employment_type,
      start_date,
      end_date,
      responsibilities,
      verifier_contact_email,
      verifier_name
    } = req.body;

    // Basic date validation
    if (!start_date) {
      return res.status(400).json({ success: false, error: 'start_date is required' });
    }
    if (end_date && new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ success: false, error: 'end_date cannot be before start_date' });
    }

    let record = await VerifiedEmployment.create({
      candidate_profile_id: candidateProfileId,
      company_name,
      title,
      employment_type,
      start_date,
      end_date,
      responsibilities,
      verification_status: 'NOT_VERIFIED',
      verification_method: 'EMPLOYER_CONFIRMATION',
      verifier_contact_email,
      verifier_name,
    });

    // No auto-email; email only sent via explicit request route
    let emailDispatched = false;
    let reviewUrl = null;

    // Reload updated values
    record = await VerifiedEmployment.findByPk(record.id);
    return res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error creating verified employment:', error);
    return res.status(500).json({ success: false, error: 'Failed to create record' });
  }
};

export const deleteVerifiedEmployment = async (req, res) => {
  try {
    if (req.user?.role !== 'candidate') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    const { id } = req.params;
    const record = await VerifiedEmployment.findByPk(id);
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
    if (record.candidate_profile_id !== req.user.candidateProfile?.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    // Delete associated notifications
    try {
      const { Notification } = await import('../models/index.js');
      await Notification.destroy({
        where: {
          user_id: req.user.id,
          type: ['work_history_verified', 'work_history_declined'],
          data: {
            [Op.contains]: {
              company_name: record.company_name,
              title: record.title
            }
          }
        }
      });
      console.log('🗑️ Deleted associated notifications for work history:', record.company_name);
    } catch (notificationError) {
      console.error('Error deleting associated notifications:', notificationError);
    }
    
    await record.destroy();
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting verified employment:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete record' });
  }
}

export const listVerifiedEmployments = async (req, res) => {
  try {
    if (req.user?.role !== 'candidate') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    const candidateProfileId = req.user.candidateProfile?.id;
    if (!candidateProfileId) {
      return res.json({ success: true, data: [] });
    }
    const records = await VerifiedEmployment.findAll({
      where: { candidate_profile_id: candidateProfileId },
      order: [['start_date', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error listing verified employment:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch records' });
  }
};

export const requestEmployerReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { verifier_contact_email, verifier_name } = req.body;
    const record = await VerifiedEmployment.findByPk(id);
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });

    // Authz: only owner can request
    if (req.user?.candidateProfile?.id !== record.candidate_profile_id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Prevent duplicate active tokens within TTL
    if (record.review_token && record.review_token_expires_at && new Date(record.review_token_expires_at) > new Date()) {
      return res.status(409).json({ success: false, error: 'A review request is already active. Please wait or resend after it expires.' });
    }

    // Check if verifier email is provided
    const verifierEmail = verifier_contact_email || record.verifier_contact_email;
    if (!verifierEmail) {
      return res.status(400).json({ success: false, error: 'Verifier email is required to send verification request' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REVIEW_TOKEN_TTL_HOURS * 60 * 60 * 1000);
    
    // Update record with token and verifier info if provided
    const updateData = { 
      review_token: token, 
      review_token_expires_at: expiresAt, 
      verification_status: 'PENDING' 
    };
    
    if (verifier_contact_email) {
      updateData.verifier_contact_email = verifier_contact_email;
    }
    if (verifier_name) {
      updateData.verifier_name = verifier_name;
    }
    
    await record.update(updateData);

    const reviewUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-employment/${token}`;

    // Send email to verifier if email exists
    let emailDispatched = false;
    if (verifierEmail) {
      try {
        console.log(`📧 Attempting to send employment verification email to ${verifierEmail}`);
        const candidateName = `${req.user.first_name} ${req.user.last_name}`;
        const verifierName = verifier_name || record.verifier_name;
        const subject = `Employment Verification Request for ${candidateName}`;
        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Employment Verification Request</h2>
          
          <p>Dear ${verifierName || 'Verifier'},</p>
          
          <p><strong>${candidateName}</strong> has requested verification of their employment at <strong>${record.company_name}</strong>.</p>
          
          <p><strong>Employment Details:</strong></p>
          <ul>
            <li><strong>Position:</strong> ${record.title}</li>
            <li><strong>Start Date:</strong> ${record.start_date}</li>
            <li><strong>End Date:</strong> ${record.end_date || 'Present'}</li>
            ${record.responsibilities ? `<li><strong>Responsibilities:</strong> ${record.responsibilities}</li>` : ''}
          </ul>
          
          <p>To verify this employment, please click the link below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Employment
            </a>
          </div>
          
          <p><strong>This verification request expires on:</strong> ${new Date(expiresAt).toLocaleDateString()}</p>
          
          <p>If you're unable to verify this employment, you can simply ignore this email.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `;
        
        await sendEmail({
          to: verifierEmail,
          subject,
          html,
        });
        emailDispatched = true;
        console.log(`✅ Employment verification email dispatched to ${verifierEmail}`);
      } catch (e) {
        console.error('Error sending verification email:', e.message);
        // Do not fail the request because of email errors
      }
    } else {
      console.log('ℹ️ No verifier_contact_email provided; skipping email dispatch');
    }

    return res.json({ success: true, data: { review_url: reviewUrl, email_dispatched: emailDispatched } });
  } catch (error) {
    console.error('Error requesting employer review:', error);
    return res.status(500).json({ success: false, error: 'Failed to request review' });
  }
};

export const getReviewByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const record = await VerifiedEmployment.findOne({ where: { review_token: token } });
    if (!record) return res.status(404).json({ success: false, error: 'Invalid token' });
    if (record.review_token_expires_at && new Date(record.review_token_expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'Token expired' });
    }
    return res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error fetching review by token:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch review' });
  }
};

export const submitReviewByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { verified, comments, corrected_title, corrected_start_date, corrected_end_date, corrected_responsibilities } = req.body;
    const record = await VerifiedEmployment.findOne({ where: { review_token: token } });
    if (!record) return res.status(404).json({ success: false, error: 'Invalid token' });
    if (record.review_token_expires_at && new Date(record.review_token_expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'Token expired' });
    }

    if (corrected_start_date && corrected_end_date && new Date(corrected_end_date) < new Date(corrected_start_date)) {
      return res.status(400).json({ success: false, error: 'Corrected end date cannot be before start date' });
    }

    const updates = {
      verification_status: verified ? 'VERIFIED' : 'DECLINED',
      notes: comments || record.notes,
      title: corrected_title || record.title,
      start_date: corrected_start_date || record.start_date,
      end_date: corrected_end_date || record.end_date,
      responsibilities: corrected_responsibilities || record.responsibilities,
      verified_at: verified ? new Date() : null,
      review_token: null,
      review_token_expires_at: null,
    };
    await record.update(updates);
    
    // Create notification for the candidate
    try {
      console.log('🔔 Creating work history notification for candidate profile:', record.candidate_profile_id);
      const candidateProfile = await CandidateProfile.findByPk(record.candidate_profile_id, {
        include: [{ model: User, as: 'user' }]
      });
      
      if (candidateProfile && candidateProfile.user) {
        console.log('🔔 Found candidate user:', candidateProfile.user.id);
        const notification = await Notification.create({
          user_id: candidateProfile.user.id,
          type: verified ? 'work_history_verified' : 'work_history_declined',
          title: verified ? 'Work History Verified!' : 'Work History Declined',
          message: verified 
            ? `Your employment at ${record.company_name} as ${record.title} has been verified!`
            : `Your employment verification request for ${record.company_name} was declined.`,
          data: {
            company_name: record.company_name,
            title: record.title,
            verification_status: verified ? 'VERIFIED' : 'DECLINED',
            verified_at: verified ? new Date() : null
          },
          is_read: false
        });
        console.log('✅ Work history notification created successfully:', notification.id);
      } else {
        console.log('❌ Could not find candidate profile or user for notification');
      }
    } catch (notificationError) {
      console.error('❌ Error creating work history notification:', notificationError);
      // Don't fail the main request if notification creation fails
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error submitting review by token:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit review' });
  }
};

export const updateVerifiedEmployment = async (req, res) => {
  try {
    if (req.user?.role !== 'candidate') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    const { id } = req.params;
    const record = await VerifiedEmployment.findByPk(id);
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
    if (record.candidate_profile_id !== req.user.candidateProfile?.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    if (record.verification_status !== 'NOT_VERIFIED') {
      return res.status(400).json({ success: false, error: 'Only NOT_VERIFIED records can be edited' });
    }

    const {
      company_name,
      title,
      employment_type,
      start_date,
      end_date,
      responsibilities,
      verifier_contact_email,
      verifier_name
    } = req.body;

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ success: false, error: 'end_date cannot be before start_date' });
    }

    await record.update({
      company_name: company_name ?? record.company_name,
      title: title ?? record.title,
      employment_type: employment_type ?? record.employment_type,
      start_date: start_date ?? record.start_date,
      end_date: end_date ?? record.end_date,
      responsibilities: responsibilities ?? record.responsibilities,
      verifier_contact_email: verifier_contact_email ?? record.verifier_contact_email,
      verifier_name: verifier_name ?? record.verifier_name,
    });

    return res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error updating verified employment:', error);
    return res.status(500).json({ success: false, error: 'Failed to update record' });
  }
}


