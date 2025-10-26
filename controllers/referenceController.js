import { Reference, ReferenceInvitation, User, ProfileView } from '../models/index.js';
import { Op } from 'sequelize';
import biasReductionService from '../services/biasReductionService.js';
import AuditService from '../services/auditService.js';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';

// Configure SendGrid only if API key is provided
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'your_sendgrid_api_key_here') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create reference invitation
const createReferenceInvitation = async (req, res) => {
  try {
    const { reviewer_email, reviewer_name, message } = req.body;
    const candidate_id = req.user.id;

    // Validate input
    if (!reviewer_email || !reviewer_name) {
      return res.status(400).json({
        success: false,
        message: 'Reviewer email and name are required'
      });
    }

    // Check if invitation already exists for this email
    const existingInvitation = await ReferenceInvitation.findOne({
      where: {
        candidate_id,
        reviewer_email,
        status: 'pending'
      }
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'An invitation has already been sent to this email address'
      });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration date (30 days from now)
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 30);

    // Create invitation
    const invitation = await ReferenceInvitation.create({
      candidate_id,
      reviewer_email,
      reviewer_name,
      token,
      message,
      expires_at
    });

    // Log the reference submission
    await AuditService.logReferenceActivity({
      userId: candidate_id,
      referenceId: invitation.id,
      actionType: 'reference_submission',
      description: `Submitted reference request to ${reviewer_name} (${reviewer_email})`,
      metadata: {
        referrerName: reviewer_name,
        referrerEmail: reviewer_email,
        message: message,
        expiresAt: expires_at
      }
    });

    // Send email invitation
    await sendReferenceInvitationEmail(invitation);

    res.status(201).json({
      success: true,
      message: 'Reference invitation sent successfully',
      data: {
        invitation_id: invitation.id,
        expires_at: invitation.expires_at
      }
    });

  } catch (error) {
    console.error('Error creating reference invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reference invitation',
      error: error.message
    });
  }
};

// Get reference invitation by token
const getReferenceInvitation = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await ReferenceInvitation.findOne({
      where: { token },
      include: [{
        model: User,
        as: 'candidate',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }]
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invitation'
      });
    }

    // Check if invitation is expired
    if (new Date() > invitation.expires_at) {
      await invitation.update({ status: 'expired' });
      return res.status(400).json({
        success: false,
        message: 'This invitation has expired'
      });
    }

    // Check if already completed
    if (invitation.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This reference has already been completed'
      });
    }

    res.json({
      success: true,
      data: invitation
    });

  } catch (error) {
    console.error('Error getting reference invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reference invitation',
      error: error.message
    });
  }
};

// Submit reference
const submitReference = async (req, res) => {
  try {
    const { token } = req.params;
    const {
      relationship,
      relationship_description,
      overall_rating,
      work_quality_rating,
      communication_rating,
      reliability_rating,
      teamwork_rating,
      reference_text,
      strengths,
      areas_for_improvement,
      would_recommend,
      would_hire_again,
      years_worked_together,
      last_worked_together
    } = req.body;

    // Validate input
    const requiredFields = [
      'relationship', 'overall_rating', 'work_quality_rating',
      'communication_rating', 'reliability_rating', 'teamwork_rating',
      'reference_text'
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Get invitation
    const invitation = await ReferenceInvitation.findOne({
      where: { token },
      include: [{
        model: User,
        as: 'candidate'
      }]
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation'
      });
    }

    // Check if invitation is expired
    if (new Date() > invitation.expires_at) {
      return res.status(400).json({
        success: false,
        message: 'This invitation has expired'
      });
    }

    // Check if already completed
    if (invitation.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This reference has already been completed'
      });
    }

    // Apply bias reduction to reference text
    let processedReferenceText = reference_text;
    let processedStrengths = strengths;
    let processedAreasForImprovement = areas_for_improvement;
    
    try {
      if (reference_text) {
        const processedData = await biasReductionService.processEndorsement({
          endorsement_text: reference_text
        });
        processedReferenceText = processedData.endorsement_text;
      }
      
      if (strengths) {
        const processedStrengthsData = await biasReductionService.processEndorsement({
          endorsement_text: strengths
        });
        processedStrengths = processedStrengthsData.endorsement_text;
      }
      
      if (areas_for_improvement) {
        const processedAreasData = await biasReductionService.processEndorsement({
          endorsement_text: areas_for_improvement
        });
        processedAreasForImprovement = processedAreasData.endorsement_text;
      }
    } catch (biasError) {
      console.error('Bias reduction failed, using original text:', biasError);
      // Continue with original text if bias reduction fails
    }

    // Create reference
    const reference = await Reference.create({
      candidate_id: invitation.candidate_id,
      invitation_id: invitation.id,
      reviewer_email: invitation.reviewer_email,
      reviewer_name: invitation.reviewer_name,
      relationship,
      relationship_description,
      overall_rating,
      work_quality_rating,
      communication_rating,
      reliability_rating,
      teamwork_rating,
      reference_text: processedReferenceText,
      strengths: processedStrengths,
      areas_for_improvement: processedAreasForImprovement,
      would_recommend,
      would_hire_again,
      years_worked_together,
      last_worked_together,
      status: 'completed'
    });

    // Update invitation status
    await invitation.update({
      status: 'completed',
      completed_at: new Date()
    });

    // Create notification for the candidate
    try {
      console.log('🔔 Creating reference notification for candidate:', invitation.candidate_id);
      const { Notification } = await import('../models/index.js');
      const notification = await Notification.create({
        user_id: invitation.candidate_id,
        type: 'reference_completed',
        title: 'New Reference Received!',
        message: `${invitation.reviewer_name} has submitted a reference for you.`,
        data: {
          reference_id: reference.id,
          reviewer_name: invitation.reviewer_name,
          reviewer_email: invitation.reviewer_email,
          overall_rating: reference.overall_rating,
          completed_at: new Date()
        },
        is_read: false
      });
      console.log('✅ Reference notification created successfully:', notification.id);
    } catch (notificationError) {
      console.error('❌ Error creating reference notification:', notificationError);
      // Don't fail the main request if notification creation fails
    }

    // Send confirmation email to candidate (don't fail if email fails)
    try {
      await sendReferenceConfirmationEmail(invitation, reference);
    } catch (emailError) {
      console.error('Error sending reference confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Reference submitted successfully',
      data: reference
    });

  } catch (error) {
    console.error('Error submitting reference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit reference',
      error: error.message
    });
  }
};

// Get candidate's references
const getCandidateReferences = async (req, res) => {
  try {
    const candidate_id = req.user.id;

    const references = await Reference.findAll({
      where: { candidate_id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: references
    });

  } catch (error) {
    console.error('Error getting candidate references:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get references',
      error: error.message
    });
  }
};

// Get candidate's reference invitations
const getCandidateReferenceInvitations = async (req, res) => {
  try {
    const candidate_id = req.user.id;

    const invitations = await ReferenceInvitation.findAll({
      where: { candidate_id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: invitations
    });

  } catch (error) {
    console.error('Error getting reference invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reference invitations',
      error: error.message
    });
  }
};

// Email functions
const sendReferenceInvitationEmail = async (invitation) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const reviewUrl = `${frontendUrl}/reference/${invitation.token}`;

    const msg = {
      to: invitation.reviewer_email,
      from: {
        email: 'noreply@yourjobplatform.com',
        name: 'Job Platform'
      },
      subject: `Professional Reference Request - ${invitation.candidate.first_name} ${invitation.candidate.last_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Professional Reference Request</h2>
          
          <p>Dear ${invitation.reviewer_name},</p>
          
          <p><strong>${invitation.candidate.first_name} ${invitation.candidate.last_name}</strong> has requested a professional reference from you.</p>
          
          ${invitation.message ? `<p><strong>Personal Message:</strong><br>${invitation.message}</p>` : ''}
          
          <p>To provide your reference, please click the link below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Provide Reference
            </a>
          </div>
          
          <p><strong>This invitation expires on:</strong> ${new Date(invitation.expires_at).toLocaleDateString()}</p>
          
          <p>If you're unable to provide a reference, you can simply ignore this email.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Reference invitation email sent successfully');

  } catch (error) {
    console.error('Error sending reference invitation email:', error);
    throw error;
  }
};

const sendReferenceConfirmationEmail = async (invitation, reference) => {
  try {
    const msg = {
      to: invitation.candidate.email,
      from: {
        email: 'noreply@yourjobplatform.com',
        name: 'Job Platform'
      },
      subject: 'Reference Received - Thank You',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reference Received</h2>
          
          <p>Dear ${invitation.candidate.first_name},</p>
          
          <p>Great news! <strong>${invitation.reviewer_name}</strong> has provided a professional reference for you.</p>
          
          <p><strong>Reference Summary:</strong></p>
          <ul>
            <li>Overall Rating: ${reference.overall_rating}/5</li>
            <li>Work Quality: ${reference.work_quality_rating}/5</li>
            <li>Communication: ${reference.communication_rating}/5</li>
            <li>Reliability: ${reference.reliability_rating}/5</li>
            <li>Teamwork: ${reference.teamwork_rating}/5</li>
            <li>Would Recommend: ${reference.would_recommend ? 'Yes' : 'No'}</li>
            <li>Would Hire Again: ${reference.would_hire_again ? 'Yes' : 'No'}</li>
          </ul>
          
          <p>You can view the complete reference in your profile.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Reference confirmation email sent successfully');

  } catch (error) {
    console.error('Error sending reference confirmation email:', error);
    throw error;
  }
};

// Request update for completed reference
const requestReferenceUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate_id = req.user.id;

    // Find the reference
    const reference = await Reference.findOne({
      where: { id, candidate_id, status: 'completed' },
      include: [{
        model: ReferenceInvitation,
        as: 'invitation'
      }]
    });

    if (!reference) {
      return res.status(404).json({
        success: false,
        message: 'Reference not found or not completed'
      });
    }

    // Generate new token for update request
    const newToken = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 30);

    // Update the invitation with new token
    await reference.invitation.update({
      token: newToken,
      expires_at,
      status: 'pending'
    });

    // Send update request email
    await sendReferenceUpdateEmail(reference.invitation, reference);

    res.json({
      success: true,
      message: 'Update request sent successfully',
      data: {
        new_token: newToken,
        expires_at
      }
    });

  } catch (error) {
    console.error('Error requesting reference update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request reference update',
      error: error.message
    });
  }
};

// Toggle outdated status for reference
const toggleReferenceOutdated = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_outdated } = req.body;
    const candidate_id = req.user.id;

    console.log('Toggle reference outdated request:', { id, is_outdated, candidate_id });

    // First find the reference invitation
    const invitation = await ReferenceInvitation.findOne({
      where: { 
        id: parseInt(id),
        candidate_id: candidate_id 
      },
      include: [{
        model: Reference,
        as: 'reference',
        required: false
      }]
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Reference invitation not found'
      });
    }

    if (invitation.status !== 'completed' || !invitation.reference) {
      return res.status(400).json({
        success: false,
        message: 'Reference not completed yet'
      });
    }

    // Update the associated reference
    await invitation.reference.update({ is_outdated });

    // Log the reference visibility change
    await AuditService.logReferenceActivity({
      userId: candidate_id,
      referenceId: invitation.id,
      actionType: 'reference_outdated_toggle',
      description: `Marked reference as ${is_outdated ? 'outdated' : 'current'}`,
      metadata: {
        referrerName: invitation.referrer_name,
        referrerEmail: invitation.reviewer_email,
        isOutdated: is_outdated,
        previousStatus: !is_outdated
      }
    });

    res.json({
      success: true,
      message: `Reference marked as ${is_outdated ? 'outdated' : 'current'}`,
      data: {
        id: invitation.id,
        isOutdated: is_outdated
      }
    });

  } catch (error) {
    console.error('Error toggling reference outdated status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reference status',
      error: error.message
    });
  }
};

// Log profile view
const logProfileView = async (req, res) => {
  try {
    const { candidate_id } = req.params;
    const viewer_id = req.user?.id || null;
    const viewer_type = req.user?.role || 'anonymous';
    const viewer_email = req.user?.email || null;
    const viewer_company = req.user?.employerProfile?.company_name || null;
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');

    // Don't log views from the candidate themselves
    if (viewer_id === candidate_id) {
      return res.json({ success: true, message: 'Self-view not logged' });
    }

    // Check if this is a duplicate view (same viewer, same day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingView = await ProfileView.findOne({
      where: {
        candidate_id,
        viewer_id,
        viewed_at: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    if (existingView) {
      return res.json({ success: true, message: 'View already logged today' });
    }

    // Create new profile view
    await ProfileView.create({
      candidate_id,
      viewer_id,
      viewer_type,
      viewer_email,
      viewer_company,
      ip_address,
      user_agent
    });

    res.json({ success: true, message: 'Profile view logged' });

  } catch (error) {
    console.error('Error logging profile view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log profile view',
      error: error.message
    });
  }
};

// Get profile view transparency data
const getProfileViewTransparency = async (req, res) => {
  try {
    const candidate_id = req.user.id;

    const views = await ProfileView.findAll({
      where: { candidate_id },
      include: [{
        model: User,
        as: 'viewer',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }],
      order: [['viewed_at', 'DESC']],
      limit: 100 // Limit to last 100 views
    });

    // Group views by date for better display
    const viewsByDate = views.reduce((acc, view) => {
      const date = view.viewed_at.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(view);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total_views: views.length,
        views_by_date: viewsByDate,
        recent_views: views.slice(0, 20)
      }
    });

  } catch (error) {
    console.error('Error getting profile view transparency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile view data',
      error: error.message
    });
  }
};

// Email function for reference update request
const sendReferenceUpdateEmail = async (invitation, reference) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const reviewUrl = `${frontendUrl}/reference/${invitation.token}`;

    const msg = {
      to: invitation.reviewer_email,
      from: {
        email: 'noreply@yourjobplatform.com',
        name: 'Job Platform'
      },
      subject: `Reference Update Request - ${invitation.candidate.first_name} ${invitation.candidate.last_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reference Update Request</h2>
          
          <p>Dear ${invitation.reviewer_name},</p>
          
          <p><strong>${invitation.candidate.first_name} ${invitation.candidate.last_name}</strong> has requested an update to your previous reference.</p>
          
          <p>You previously provided a reference on ${reference.created_at.toLocaleDateString()}. The candidate would like you to review and potentially update your feedback.</p>
          
          <p>To update your reference, please click the link below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Update Reference
            </a>
          </div>
          
          <p><strong>This update request expires on:</strong> ${new Date(invitation.expires_at).toLocaleDateString()}</p>
          
          <p>If you don't wish to update your reference, you can simply ignore this email.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Reference update email sent successfully');

  } catch (error) {
    console.error('Error sending reference update email:', error);
    throw error;
  }
};

export {
  createReferenceInvitation,
  getReferenceInvitation,
  submitReference,
  getCandidateReferences,
  getCandidateReferenceInvitations,
  requestReferenceUpdate,
  toggleReferenceOutdated,
  logProfileView,
  getProfileViewTransparency
};
