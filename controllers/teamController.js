import { TeamMember } from '../models/TeamMember.js';
import { EmployerProfile } from '../models/EmployerProfile.js';
import User from '../models/User.js';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import { Op } from 'sequelize';

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Get all team members for an employer
export const getTeamMembers = async (req, res) => {
  try {
    const { employerProfileId } = req.params;
    
    // Verify the user has permission to view team members
    const employerProfile = await EmployerProfile.findOne({
      where: { 
        id: employerProfileId,
        user_id: req.user.id 
      }
    });

    if (!employerProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to view this team' 
      });
    }

    const teamMembers = await TeamMember.findAll({
      where: { employer_profile_id: employerProfileId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name', 'is_active'],
        required: false
      }],
      order: [['created_at', 'ASC']]
    });

    res.json({ 
      success: true, 
      teamMembers 
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch team members' 
    });
  }
};

// Add/invite a new team member
export const inviteTeamMember = async (req, res) => {
  try {
    const { 
      first_name, 
      last_name, 
      email, 
      role, 
      permissions, 
      phone, 
      department, 
      job_title,
      employer_profile_id 
    } = req.body;

    // Verify the user has permission to manage team
    const employerProfile = await EmployerProfile.findOne({
      where: { 
        id: employer_profile_id,
        user_id: req.user.id 
      }
    });

    if (!employerProfile || !employerProfile.permissions?.can_manage_team) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to manage team members' 
      });
    }

    // Check if email already exists in this company
    const existingMember = await TeamMember.findOne({
      where: { 
        employer_profile_id,
        email 
      }
    });

    if (existingMember) {
      return res.status(400).json({ 
        success: false, 
        error: 'Team member with this email already exists' 
      });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create team member record
    const teamMember = await TeamMember.create({
      employer_profile_id,
      first_name,
      last_name,
      email,
      role,
      permissions,
      phone,
      department,
      job_title,
      invitation_token: invitationToken,
      invitation_expires_at: invitationExpiresAt,
      invited_by: req.user.id,
      invited_at: new Date(),
      invitation_status: 'pending'
    });

    // Send invitation email using SendGrid
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/team/accept-invitation?token=${invitationToken}`;
    
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@jobplatform.com',
      subject: `You've been invited to join ${employerProfile.company_name || 'our team'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to join ${employerProfile.company_name || 'our team'}!</h2>
          <p>Hi ${first_name},</p>
          <p>${req.user.first_name} ${req.user.last_name} has invited you to join their team as a <strong>${role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your Role: ${role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
            <p><strong>Company:</strong> ${employerProfile.company_name || 'Company'}</p>
            ${department ? `<p><strong>Department:</strong> ${department}</p>` : ''}
            ${job_title ? `<p><strong>Position:</strong> ${job_title}</p>` : ''}
          </div>
          
          <p>Click the button below to accept the invitation and create your account:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days. If you have any questions, please contact ${req.user.first_name} at ${req.user.email}.</p>
        </div>
      `
    };

    await sgMail.send(msg);

    res.json({ 
      success: true, 
      message: 'Team member invited successfully',
      teamMember: {
        ...teamMember.toJSON(),
        invitation_token: undefined // Don't send token in response
      }
    });
  } catch (error) {
    console.error('Invite team member error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to invite team member' 
    });
  }
};

// Verify invitation token (for the invitation acceptance page)
export const verifyInvitation = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invitation token is required' 
      });
    }

    // Find team member by invitation token
    const teamMember = await TeamMember.findOne({
      where: { 
        invitation_token: token,
        invitation_status: 'pending',
        invitation_expires_at: {
          [Op.gt]: new Date()
        }
      },
      include: [{
        model: EmployerProfile,
        as: 'employerProfile'
      }]
    });

    if (!teamMember) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired invitation token' 
      });
    }

    res.json({ 
      success: true, 
      invitation: {
        email: teamMember.email,
        first_name: teamMember.first_name,
        last_name: teamMember.last_name,
        role: teamMember.role,
        department: teamMember.department,
        job_title: teamMember.job_title,
        company_name: teamMember.employerProfile?.company_name
      }
    });
  } catch (error) {
    console.error('Verify invitation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify invitation' 
    });
  }
};

// Accept team invitation and create user account
export const acceptInvitation = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find team member by invitation token
    const teamMember = await TeamMember.findOne({
      where: { 
        invitation_token: token,
        invitation_status: 'pending',
        invitation_expires_at: {
          [Op.gt]: new Date()
        }
      },
      include: [{
        model: EmployerProfile,
        as: 'employerProfile'
      }]
    });

    if (!teamMember) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired invitation token' 
      });
    }

    // Check if user already exists with this email
    let user = await User.findOne({ where: { email: teamMember.email } });
    
    if (user) {
      return res.status(400).json({ 
        success: false, 
        error: 'An account with this email already exists' 
      });
    }

    // Create user account
    user = await User.create({
      email: teamMember.email,
      password_hash: password, // This will be hashed by the User model
      role: 'team_member',
      first_name: teamMember.first_name,
      last_name: teamMember.last_name,
      phone: teamMember.phone,
      is_active: true,
      is_verified: true // Team members are pre-verified since they're invited by the company
    });

    // Update team member record
    await teamMember.update({
      user_id: user.id,
      invitation_status: 'accepted',
      joined_at: new Date(),
      invitation_token: null,
      invitation_expires_at: null
    });

    res.json({ 
      success: true, 
      message: 'Invitation accepted successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to accept invitation' 
    });
  }
};

// Get team member profile (for logged-in team members)
export const getTeamMemberProfile = async (req, res) => {
  try {
    if (req.user.role !== 'team_member') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    const teamMember = await TeamMember.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: EmployerProfile,
        as: 'employerProfile'
      }]
    });

    if (!teamMember) {
      return res.status(404).json({ 
        success: false, 
        error: 'Team member profile not found' 
      });
    }

    res.json({ 
      success: true, 
      teamMember,
      permissions: teamMember.permissions
    });
  } catch (error) {
    console.error('Get team member profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch team member profile' 
    });
  }
};

// Update team member
export const updateTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const teamMember = await TeamMember.findByPk(id);
    if (!teamMember) {
      return res.status(404).json({ 
        success: false, 
        error: 'Team member not found' 
      });
    }

    // Verify permission to update
    const employerProfile = await EmployerProfile.findOne({
      where: { 
        id: teamMember.employer_profile_id,
        user_id: req.user.id 
      }
    });

    if (!employerProfile || !employerProfile.permissions?.can_manage_team) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to update team members' 
      });
    }

    await teamMember.update(updates);

    res.json({ 
      success: true, 
      teamMember 
    });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update team member' 
    });
  }
};

// Delete team member
export const deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;

    const teamMember = await TeamMember.findByPk(id);
    if (!teamMember) {
      return res.status(404).json({ 
        success: false, 
        error: 'Team member not found' 
      });
    }

    // Verify permission to delete
    const employerProfile = await EmployerProfile.findOne({
      where: { 
        id: teamMember.employer_profile_id,
        user_id: req.user.id 
      }
    });

    if (!employerProfile || !employerProfile.permissions?.can_manage_team) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to remove team members' 
      });
    }

    // If team member has a user account, deactivate it
    if (teamMember.user_id) {
      await User.update(
        { is_active: false },
        { where: { id: teamMember.user_id } }
      );
    }

    await teamMember.destroy();

    res.json({ 
      success: true, 
      message: 'Team member removed successfully' 
    });
  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove team member' 
    });
  }
};
