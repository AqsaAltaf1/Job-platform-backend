import { Experience } from '../models/Experience.js';
import { PeerEndorsement } from '../models/PeerEndorsement.js';
import { ReviewerInvitation } from '../models/ReviewerInvitation.js';
import ReferenceInvitation from '../models/ReferenceInvitation.js';
import Reference from '../models/Reference.js';
import { Op } from 'sequelize';
import { CandidateProfile } from '../models/CandidateProfile.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/emailService.js';
import crypto from 'crypto';

/**
 * Get verified work history for a candidate
 */
export const getVerifiedWorkHistory = async (req, res) => {
  try {
    const candidateId = req.user.id;
    const candidateProfileId = req.user.candidateProfile?.id;

    // If no candidate profile exists, return empty array
    if (!candidateProfileId) {
      return res.json({
        success: true,
        workHistory: []
      });
    }

    // Get experiences with verification status
    const experiences = await Experience.findAll({
      where: { user_profile_id: candidateProfileId },
      order: [['from_date', 'DESC']]
    });

    // Transform experiences to include verification status
    const workHistory = experiences.map(exp => ({
      id: exp.id,
      company: exp.company_name,
      role: exp.role,
      startDate: exp.from_date,
      endDate: exp.to_date,
      duration: calculateDuration(exp.from_date, exp.to_date),
      isVerified: exp.is_verified || false,
      verifiedBy: exp.verified_by,
      verifiedAt: exp.verified_at
    }));

    res.json({
      success: true,
      workHistory
    });
  } catch (error) {
    console.error('Error fetching verified work history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work history'
    });
  }
};

/**
 * Get references for a candidate
 */
export const getReferences = async (req, res) => {
  try {
    const candidateId = req.user.id;

    // Get reference invitations
    const referenceInvitations = await ReferenceInvitation.findAll({
      where: { candidate_id: candidateId },
      include: [{
        model: Reference,
        as: 'reference',
        required: false
      }],
      order: [['created_at', 'DESC']]
    });

    // Transform to reference format
    const references = referenceInvitations.map(invitation => ({
      id: invitation.id,
      referrerName: invitation.reviewer_name,
      referrerEmail: invitation.reviewer_email,
      referrerPosition: '', // Not stored in ReferenceInvitation
      referrerCompany: '', // Not stored in ReferenceInvitation
      relationship: invitation.reference?.relationship || '',
      keyCompetencies: [], // Will be populated from reference data
      isVisible: invitation.reference?.is_public || false,
      endorsementText: invitation.reference?.reference_text || '',
      rating: invitation.reference?.overall_rating || 0,
      status: invitation.status,
      createdAt: invitation.created_at,
      completedAt: invitation.reference?.created_at,
      expiresAt: invitation.expires_at,
      message: invitation.message
    }));

    res.json({
      success: true,
      references
    });
  } catch (error) {
    console.error('Error fetching references:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch references'
    });
  }
};

/**
 * Get reference templates
 */
export const getReferenceTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: '1',
        name: 'Technical Skills',
        description: 'For technical roles and engineering positions',
        message: 'I would like to request a reference for my technical skills and engineering capabilities.',
        skills: ['Programming', 'System Design', 'Problem Solving', 'Code Quality', 'Technical Leadership']
      },
      {
        id: '2',
        name: 'Leadership & Management',
        description: 'For leadership and management positions',
        message: 'I would like to request a reference for my leadership and management abilities.',
        skills: ['Team Leadership', 'Project Management', 'Strategic Thinking', 'Decision Making', 'Communication']
      },
      {
        id: '3',
        name: 'General Professional',
        description: 'For general professional roles',
        message: 'I would like to request a reference for my professional work and collaboration skills.',
        skills: ['Communication', 'Collaboration', 'Work Ethic', 'Adaptability', 'Problem Solving']
      },
      {
        id: '4',
        name: 'Creative & Design',
        description: 'For creative and design positions',
        message: 'I would like to request a reference for my creative and design capabilities.',
        skills: ['Creativity', 'Design Thinking', 'Visual Communication', 'Innovation', 'User Experience']
      },
      {
        id: '5',
        name: 'Sales & Marketing',
        description: 'For sales and marketing roles',
        message: 'I would like to request a reference for my sales and marketing expertise.',
        skills: ['Sales Performance', 'Customer Relations', 'Marketing Strategy', 'Negotiation', 'Brand Management']
      }
    ];

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching reference templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reference templates'
    });
  }
};

/**
 * Send reference request
 */
export const sendReferenceRequest = async (req, res) => {
  try {
    const {
      referrerEmail,
      referrerName,
      referrerPosition,
      referrerCompany,
      templateId,
      customMessage,
      skills
    } = req.body;

    // Validate input
    if (!referrerEmail || !referrerName) {
      return res.status(400).json({
        success: false,
        message: 'Reviewer email and name are required'
      });
    }

    // Check if a reference invitation already exists for this email
    const existingInvitation = await ReferenceInvitation.findOne({
      where: {
        candidate_id: req.user.id,
        reviewer_email: referrerEmail,
        status: ['pending', 'completed'] // Don't allow duplicates for pending or completed
      }
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'A reference request has already been sent to this email address'
      });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration date (30 days from now)
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 30);

    // Create reference invitation
    const invitation = await ReferenceInvitation.create({
      candidate_id: req.user.id,
      reviewer_email: referrerEmail,
      reviewer_name: referrerName,
      token,
      message: customMessage || '',
      status: 'pending',
      expires_at
    });

    // Send email notification to referrer
    try {
      const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reference/${token}`;
      const candidateName = `${req.user.first_name} ${req.user.last_name}`;
      
      const emailData = {
        to: referrerEmail,
        subject: `Reference Request from ${candidateName}`,
        text: `Hello ${referrerName},

${candidateName} has requested a professional reference from you.

They would like you to provide a reference for their professional skills and work experience.

What you need to do:
1. Click the link below to access the reference form
2. Review the skills and competencies they've listed
3. Provide your honest assessment and feedback
4. Submit your reference

Reference Link: ${invitationLink}

Important: This invitation will expire on ${expires_at.toLocaleDateString()}.

If you have any questions or concerns, please contact ${candidateName} directly.

This is an automated message. Please do not reply to this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">Professional Reference Request</h2>
            <p>Hello ${referrerName},</p>
            <p><strong>${candidateName}</strong> has requested a professional reference from you.</p>
            <p>They would like you to provide a reference for their professional skills and work experience.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">What you need to do:</h3>
              <ol>
                <li>Click the link below to access the reference form</li>
                <li>Review the skills and competencies they've listed</li>
                <li>Provide your honest assessment and feedback</li>
                <li>Submit your reference</li>
              </ol>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" 
                 style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Provide Reference
              </a>
            </div>
            <p><strong>Important:</strong> This invitation will expire on ${expires_at.toLocaleDateString()}.</p>
            <p>If you have any questions or concerns, please contact ${candidateName} directly.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `,
      };

      await sendEmail(emailData);
      console.log('Reference request email sent successfully to:', referrerEmail);
    } catch (emailError) {
      console.error('Error sending reference request email:', emailError);
      // Don't fail the request if email fails, just log the error
    }
    
    res.json({
      success: true,
      message: 'Reference request sent successfully',
      invitationId: invitation.id,
      invitationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reference/${token}`
    });
  } catch (error) {
    console.error('Error sending reference request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reference request'
    });
  }
};

/**
 * Toggle reference visibility
 */
export const toggleReferenceVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVisible } = req.body;
    const candidateId = req.user.id;

    console.log('Toggle reference visibility request:', { id, isVisible, candidateId });

    // Find the reference invitation
    const invitation = await ReferenceInvitation.findOne({
      where: { 
        id: parseInt(id),
        candidate_id: candidateId 
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

    // If reference is completed, update the reference visibility
    if (invitation.reference) {
      await invitation.reference.update({ is_public: isVisible });
    } else {
      // For pending invitations, we can't really toggle visibility since there's no reference yet
      return res.status(400).json({
        success: false,
        message: 'Cannot toggle visibility for pending references'
      });
    }

    res.json({
      success: true,
      message: `Reference ${isVisible ? 'made visible' : 'hidden'} successfully`
    });
  } catch (error) {
    console.error('Error updating reference visibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reference visibility',
      error: error.message
    });
  }
};

/**
 * Remove reference
 */
export const removeReference = async (req, res) => {
  try {
    const { id } = req.params;
    const candidateId = req.user.id;

    console.log('Remove reference request:', { id, candidateId, idType: typeof id });

    // Find the reference invitation
    const invitation = await ReferenceInvitation.findOne({
      where: { 
        id: parseInt(id),
        candidate_id: candidateId 
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

    // Delete associated notifications
    try {
      const { Notification } = await import('../models/index.js');
      await Notification.destroy({
        where: {
          user_id: candidateId,
          type: 'reference_completed',
          data: {
            [Op.contains]: {
              reviewer_name: invitation.reviewer_name,
              reviewer_email: invitation.reviewer_email
            }
          }
        }
      });
      console.log('🗑️ Deleted associated notifications for reference:', invitation.reviewer_name);
    } catch (notificationError) {
      console.error('Error deleting associated notifications:', notificationError);
    }

    // If there's an associated reference, delete it first
    if (invitation.reference) {
      await Reference.destroy({
        where: { invitation_id: parseInt(id) }
      });
    }

    // Delete the invitation
    await ReferenceInvitation.destroy({ 
      where: { 
        id: parseInt(id),
        candidate_id: candidateId 
      } 
    });

    res.json({
      success: true,
      message: 'Reference removed successfully'
    });
  } catch (error) {
    console.error('Error removing reference:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove reference',
      error: error.message
    });
  }
};

/**
 * Get candidate dashboard stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    const candidateId = req.user.id;
    const candidateProfileId = req.user.candidateProfile?.id;

    // Get basic stats
    const stats = {
      profileViews: 0, // TODO: Implement profile view tracking
      appliedJobs: 0, // TODO: Get from job applications
      invitations: 0, // TODO: Get from invitations
      profileReviews: 0, // TODO: Get from reviews
      profileViewsData: [
        { month: 'Jan', views: 0 },
        { month: 'Feb', views: 0 },
        { month: 'Mar', views: 0 },
        { month: 'Apr', views: 0 },
        { month: 'May', views: 0 },
        { month: 'Jun', views: 0 }
      ],
      applicationStatus: {
        rejected: 0,
        accepted: 0,
        interview: 0,
        pending: 0
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats'
    });
  }
};

/**
 * Get transparency data for candidate
 */
export const getTransparencyData = async (req, res) => {
  try {
    const candidateId = req.user.id;
    const candidateProfileId = req.user.candidateProfile?.id;

    // If no candidate profile exists, return empty data
    if (!candidateProfileId) {
      return res.json({
        success: true,
        data: {
          profile_completion: 0,
          verified_work_history: [],
          references: [],
          skills_endorsements: [],
          applications: [],
          transparency_score: 0
        }
      });
    }

    // Get verified work history
    const workHistory = await Experience.findAll({
      where: { 
        user_profile_id: candidateProfileId,
        is_verified: true 
      },
      order: [['end_date', 'DESC']]
    });

    // Get references
    const references = await ReferenceInvitation.findAll({
      where: { candidate_id: candidateId },
      include: [{
        model: Reference,
        as: 'reference',
        required: false
      }],
      order: [['created_at', 'DESC']]
    });

    // Get skills endorsements
    const endorsements = await PeerEndorsement.findAll({
      where: { candidate_profile_id: candidateProfileId },
      include: [{
        model: ReviewerInvitation,
        as: 'invitation',
        required: false
      }],
      order: [['created_at', 'DESC']]
    });

    // Get applications
    const { Application } = await import('../models/Application.js');
    const applications = await Application.findAll({
      where: { candidate_id: candidateId },
      order: [['created_at', 'DESC']],
      limit: 10
    });

    // Calculate profile completion
    const profileCompletion = await calculateProfileCompletion(candidateProfileId);

    // Calculate transparency score
    const transparencyScore = Math.min(100, 
      (workHistory.length * 15) + 
      (references.filter(r => r.reference).length * 20) + 
      (endorsements.length * 10) + 
      (profileCompletion * 0.3)
    );

    const transparencyData = {
      profile_completion: profileCompletion,
      verified_work_history: workHistory.map(exp => ({
        id: exp.id,
        company: exp.company_name,
        position: exp.job_title,
        duration: calculateDuration(exp.start_date, exp.end_date),
        verified: exp.is_verified,
        verified_at: exp.verified_at
      })),
      references: references.map(ref => ({
        id: ref.id,
        reviewer_name: ref.reviewer_name,
        reviewer_email: ref.reviewer_email,
        status: ref.status,
        completed: !!ref.reference,
        created_at: ref.created_at,
        expires_at: ref.expires_at
      })),
      skills_endorsements: endorsements.map(end => ({
        id: end.id,
        skill_name: end.skill_name,
        rating: end.rating,
        endorsement_text: end.endorsement_text,
        reviewer_name: end.invitation?.reviewer_name || 'Anonymous',
        created_at: end.created_at
      })),
      applications: applications.map(app => ({
        id: app.id,
        job_title: app.job_title,
        company: app.company_name,
        status: app.status,
        applied_at: app.created_at
      })),
      transparency_score: Math.round(transparencyScore)
    };

    res.json({
      success: true,
      data: transparencyData
    });
  } catch (error) {
    console.error('Error fetching transparency data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transparency data'
    });
  }
};

// Helper functions
function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} days`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    let result = `${years} year${years > 1 ? 's' : ''}`;
    if (remainingMonths > 0) {
      result += ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
    return result;
  }
}

async function getCandidateSkillIds(candidateProfileId) {
  if (!candidateProfileId) return [];
  
  const { EnhancedSkill } = await import('../models/EnhancedSkill.js');
  const skills = await EnhancedSkill.findAll({
    where: { candidate_profile_id: candidateProfileId },
    attributes: ['id']
  });
  
  return skills.map(skill => skill.id);
}

function generateInvitationToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
