import { ReviewerInvitation, CandidateProfile, EnhancedSkill, PeerEndorsement, User } from '../models/index.js';
import { updateSkillAverageRating } from './enhancedSkillController.js';
import biasReductionService from '../services/biasReductionService.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import { sendEmail } from '../utils/emailService.js';
import dotenv from 'dotenv';
import { Op } from 'sequelize';

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Get all reviewer invitations for a candidate
export const getCandidateInvitations = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const invitations = await ReviewerInvitation.findAll({
      where: { 
        candidate_profile_id: candidateId,
        is_active: true 
      },
      order: [['created_at', 'DESC']]
    });

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching reviewer invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
};

// Create a new reviewer invitation
export const createReviewerInvitation = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { reviewer_email, reviewer_name, skills_to_review } = req.body;

    // Verify candidate profile exists
    const candidateProfile = await CandidateProfile.findByPk(candidateId);
    if (!candidateProfile) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }

    // Check for existing pending invitations for this email and skill
    const existingInvitation = await ReviewerInvitation.findOne({
      where: {
        candidate_profile_id: candidateId,
        reviewer_email: reviewer_email,
        status: 'pending',
        is_active: true
      }
    });

    if (existingInvitation) {
      console.log('Found existing invitation:', existingInvitation);
      console.log('Existing skills_to_review:', existingInvitation.skills_to_review);
      console.log('Type of skills_to_review:', typeof existingInvitation.skills_to_review);
      
      // Check if this skill is already included in the existing invitation
      let existingSkills = [];
      
      if (existingInvitation.skills_to_review) {
        // Handle both array and JSON string formats
        if (Array.isArray(existingInvitation.skills_to_review)) {
          existingSkills = existingInvitation.skills_to_review;
        } else if (typeof existingInvitation.skills_to_review === 'string') {
          try {
            existingSkills = JSON.parse(existingInvitation.skills_to_review);
          } catch (parseError) {
            console.error('Error parsing existing invitation skills:', parseError);
            console.error('Raw skills_to_review value:', existingInvitation.skills_to_review);
            // If we can't parse, assume it's a different invitation and allow the new one to proceed
            existingSkills = [];
          }
        }
      }
      
      console.log('Existing skills:', existingSkills);
      const hasSkill = skills_to_review.some(skillId => existingSkills.includes(skillId));
      
      if (hasSkill) {
        return res.status(400).json({ 
          error: `An invitation has already been sent to ${reviewer_email} for this skill and is still pending. Please wait for them to respond or choose a different email address.` 
        });
      }
    }

    // Check for existing endorsements for this email and skill
    const existingEndorsement = await PeerEndorsement.findOne({
      where: {
        endorser_email: reviewer_email,
        enhanced_skill_id: {
          [Op.in]: skills_to_review
        }
      }
    });

    if (existingEndorsement) {
      return res.status(400).json({ 
        error: `${reviewer_email} has already provided an endorsement for this skill. You cannot send another invitation to the same person.` 
      });
    }

    // Generate unique invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await ReviewerInvitation.create({
      id: uuidv4(),
      candidate_profile_id: candidateId,
      reviewer_email,
      reviewer_name,
      skills_to_review,
      invitation_token: invitationToken,
      expires_at: expiresAt
    });

    // Send email invitation
    try {
      const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/review-skills/${invitationToken}`;
      
      const emailData = {
        to: reviewer_email,
        subject: `Skills Endorsement Request from ${candidateProfile.first_name} ${candidateProfile.last_name}`,
        text: `Hello ${reviewer_name},

${candidateProfile.first_name} ${candidateProfile.last_name} has requested your endorsement for their specific technical and professional skills.

This is a SKILLS ENDORSEMENT request where you'll be asked to validate their proficiency in specific skills they've listed.

What you need to do:
1. Click the link below to access the skills endorsement form
2. Review each skill they've listed with their self-assessed level
3. Provide your honest assessment of their skill level
4. Submit your endorsements

Skills Endorsement Link: ${invitationLink}

Important: This invitation will expire on ${expiresAt.toLocaleDateString()}.

If you have any questions or concerns, please contact ${candidateProfile.first_name} directly.

This is an automated message. Please do not reply to this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">Skills Endorsement Request</h2>
            <p>Hello ${reviewer_name},</p>
            <p><strong>${candidateProfile.first_name} ${candidateProfile.last_name}</strong> has requested your endorsement for their specific technical and professional skills.</p>
            <p>This is a <strong>SKILLS ENDORSEMENT</strong> request where you'll be asked to validate their proficiency in specific skills they've listed.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">What you need to do:</h3>
              <ol>
                <li>Click the link below to access the skills endorsement form</li>
                <li>Review each skill they've listed with their self-assessed level</li>
                <li>Provide your honest assessment of their skill level</li>
                <li>Submit your endorsements</li>
              </ol>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" 
                 style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Provide Skills Endorsement
              </a>
            </div>
            <p><strong>Important:</strong> This invitation will expire on ${expiresAt.toLocaleDateString()}.</p>
            <p>If you have any questions or concerns, please contact ${candidateProfile.first_name} directly.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `,
      };

      await sendEmail(emailData);
      console.log('Endorsement invitation email sent successfully');
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails, just log the error
    }

    res.status(201).json({
      ...invitation.toJSON(),
      invitation_link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/review-skills/${invitationToken}`,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Error creating reviewer invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
};

// Get invitation by token (for reviewers)
export const getInvitationByToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    const invitation = await ReviewerInvitation.findOne({
      where: { 
        invitation_token: token,
        is_active: true 
      },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          include: [
            {
              model: EnhancedSkill,
              as: 'coreSkills',
              where: { 
                is_active: true
              },
              required: false,
            }
          ]
        }
      ]
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or expired' });
    }

    // Check if invitation is expired
    if (new Date() > invitation.expires_at) {
      await invitation.update({ status: 'expired' });
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    // Get candidate user information
    const candidateUser = await User.findByPk(invitation.candidateProfile.user_id);

    res.json({
      id: invitation.id,
      reviewer_name: invitation.reviewer_name,
      reviewer_email: invitation.reviewer_email,
      skills_to_review: invitation.skills_to_review,
      status: invitation.status,
      expires_at: invitation.expires_at,
      candidateProfile: {
        id: invitation.candidateProfile.id,
        first_name: candidateUser.first_name,
        last_name: candidateUser.last_name,
        email: candidateUser.email,
        coreSkills: invitation.candidateProfile.coreSkills || []
      }
    });
  } catch (error) {
    console.error('Error fetching invitation by token:', error);
    res.status(500).json({ error: 'Failed to fetch invitation' });
  }
};

// Submit reviewer feedback
export const submitReviewerFeedback = async (req, res) => {
  try {
    const { token } = req.params;
    const { 
      relationship, 
      skills, 
      comments, 
      rating, 
      biasCheckConfirmed 
    } = req.body;
    
    const invitation = await ReviewerInvitation.findOne({
      where: { 
        invitation_token: token,
        is_active: true 
      },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          include: [
            {
              model: EnhancedSkill,
              as: 'coreSkills',
              where: { 
                is_active: true
              },
              required: false,
            }
          ]
        }
      ]
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation is expired
    if (new Date() > invitation.expires_at) {
      await invitation.update({ status: 'expired' });
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    // Check if already completed
    if (invitation.status === 'completed') {
      return res.status(400).json({ error: 'Feedback already submitted' });
    }

    // Validate required fields
    if (!relationship || !skills || skills.length === 0 || !comments?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!biasCheckConfirmed) {
      return res.status(400).json({ error: 'Bias check confirmation required' });
    }

    // Apply bias reduction to comments
    let processedComments = comments;
    try {
      const processedData = await biasReductionService.processEndorsement({
        endorsement_text: comments
      });
      processedComments = processedData.endorsement_text;
    } catch (biasError) {
      console.error('Bias reduction failed, using original text:', biasError);
      // Continue with original text if bias reduction fails
    }

    // Create endorsements for each skill
    const createdEndorsements = [];
    for (const skillRating of skills) {
      const [skillName, level] = skillRating.split(':');
      
      // Find the corresponding enhanced skill
      const skill = invitation.candidateProfile.coreSkills.find(s => 
        s.name.toLowerCase() === skillName.toLowerCase()
      );
      
      if (skill) {
        const newEndorsement = await PeerEndorsement.create({
          id: uuidv4(),
          enhanced_skill_id: skill.id,
          endorser_name: invitation.reviewer_name || 'Anonymous',
          endorser_email: invitation.reviewer_email,
          endorser_position: '', // Could be added to invitation
          endorser_company: '', // Could be added to invitation
          relationship: relationship,
          endorsement_text: processedComments,
          skill_level: level,
          star_rating: rating || 3,
          verified: true // Auto-verify endorsements from invited reviewers
        });
        createdEndorsements.push(newEndorsement);

        // Update the average rating for this skill
        await updateSkillAverageRating(skill.id);
      }
    }

    // Mark invitation as completed
    await invitation.update({ 
      status: 'completed',
      completed_at: new Date()
    });

    // Send notification to candidate about new reference
    try {
      const { Notification } = await import('../models/index.js');
      await Notification.create({
        user_id: invitation.candidateProfile.user_id,
        type: 'reference',
        title: 'New Reference Received',
        message: `${invitation.reviewer_name || 'Someone'} has submitted a reference for you.`,
        data: {
          referrerName: invitation.reviewer_name,
          type: 'reference_submitted'
        },
        is_read: false
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.json({ 
      message: 'Reference submitted successfully',
      endorsements: createdEndorsements
    });
  } catch (error) {
    console.error('Error submitting reviewer feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

// Update invitation status
export const updateInvitationStatus = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const { status } = req.body;

    const invitation = await ReviewerInvitation.findByPk(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    await invitation.update({ status });
    res.json(invitation);
  } catch (error) {
    console.error('Error updating invitation status:', error);
    res.status(500).json({ error: 'Failed to update invitation' });
  }
};

// Delete reviewer invitation
export const deleteReviewerInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    const invitation = await ReviewerInvitation.findByPk(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    await invitation.update({ is_active: false });
    res.json({ message: 'Invitation deleted successfully' });
  } catch (error) {
    console.error('Error deleting reviewer invitation:', error);
    res.status(500).json({ error: 'Failed to delete invitation' });
  }
};
