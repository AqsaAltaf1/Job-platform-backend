import JobApplication from '../models/JobApplication.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { EmployerProfile } from '../models/EmployerProfile.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { TeamMember } from '../models/TeamMember.js';
import { Op } from 'sequelize';
import { sendEmail } from '../utils/emailService.js';

// Bulk update application statuses
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { application_ids, new_status, notes } = req.body;

    if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Application IDs are required'
      });
    }

    if (!new_status) {
      return res.status(400).json({
        success: false,
        error: 'New status is required'
      });
    }

    const validStatuses = ['pending', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected'];
    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Get applications with job and employer info
    const applications = await JobApplication.findAll({
      where: { id: { [Op.in]: application_ids } },
      include: [
        {
          model: Job,
          as: 'job',
          include: [{
            model: EmployerProfile,
            as: 'employerProfile'
          }]
        },
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }]
        }
      ]
    });

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No applications found'
      });
    }

    // Check permissions for all applications
    let hasPermission = true;
    const employerProfileIds = [...new Set(applications.map(app => app.job.employer_profile_id))];

    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
      hasPermission = employerProfile && employerProfileIds.every(id => id === employerProfile.id);
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          is_active: true
        }
      });
      hasPermission = teamMember && employerProfileIds.every(id => id === teamMember.employer_profile_id) && (
        teamMember.role === 'primary_owner' || 
        teamMember.permissions?.can_review_applications
      );
    } else {
      hasPermission = false;
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update applications
    const updateData = {
      status: new_status,
      reviewed_by: req.user.id,
      reviewed_at: new Date()
    };

    if (notes) {
      updateData.notes = notes;
    }

    const [updatedCount] = await JobApplication.update(updateData, {
      where: { id: { [Op.in]: application_ids } }
    });

    // Send notification emails if status changed to hired or rejected
    if (new_status === 'hired' || new_status === 'rejected') {
      const emailPromises = applications.map(application => 
        sendStatusUpdateEmail(application, new_status)
      );
      await Promise.allSettled(emailPromises);
    }

    res.json({
      success: true,
      message: `Successfully updated ${updatedCount} applications`,
      updated_count: updatedCount
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update applications'
    });
  }
};

// Bulk send emails to candidates
export const bulkSendEmails = async (req, res) => {
  try {
    const { application_ids, email_type, subject, message, template_id } = req.body;

    if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Application IDs are required'
      });
    }

    if (!email_type || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Email type, subject, and message are required'
      });
    }

    // Get applications with candidate info
    const applications = await JobApplication.findAll({
      where: { id: { [Op.in]: application_ids } },
      include: [
        {
          model: Job,
          as: 'job',
          include: [{
            model: EmployerProfile,
            as: 'employerProfile'
          }]
        },
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }]
        }
      ]
    });

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No applications found'
      });
    }

    // Check permissions (same as bulk update)
    let hasPermission = true;
    const employerProfileIds = [...new Set(applications.map(app => app.job.employer_profile_id))];

    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
      hasPermission = employerProfile && employerProfileIds.every(id => id === employerProfile.id);
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          is_active: true
        }
      });
      hasPermission = teamMember && employerProfileIds.every(id => id === teamMember.employer_profile_id) && (
        teamMember.role === 'primary_owner' || 
        teamMember.permissions?.can_send_emails
      );
    } else {
      hasPermission = false;
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Send emails
    const emailPromises = applications.map(application => 
      sendBulkEmail(application, email_type, subject, message, template_id)
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failCount = results.filter(result => result.status === 'rejected').length;

    res.json({
      success: true,
      message: `Sent ${successCount} emails successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      sent_count: successCount,
      failed_count: failCount
    });
  } catch (error) {
    console.error('Bulk send emails error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send emails'
    });
  }
};

// Bulk delete applications
export const bulkDeleteApplications = async (req, res) => {
  try {
    const { application_ids, reason } = req.body;

    if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Application IDs are required'
      });
    }

    // Get applications to check permissions
    const applications = await JobApplication.findAll({
      where: { id: { [Op.in]: application_ids } },
      include: [{
        model: Job,
        as: 'job',
        include: [{
          model: EmployerProfile,
          as: 'employerProfile'
        }]
      }]
    });

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No applications found'
      });
    }

    // Check permissions (only primary owners can delete)
    let hasPermission = false;
    const employerProfileIds = [...new Set(applications.map(app => app.job.employer_profile_id))];

    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
      hasPermission = employerProfile && employerProfileIds.every(id => id === employerProfile.id);
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          is_active: true
        }
      });
      hasPermission = teamMember && employerProfileIds.every(id => id === teamMember.employer_profile_id) && 
        teamMember.role === 'primary_owner';
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only primary owners can delete applications.'
      });
    }

    // Delete applications
    const deletedCount = await JobApplication.destroy({
      where: { id: { [Op.in]: application_ids } }
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} applications`,
      deleted_count: deletedCount
    });
  } catch (error) {
    console.error('Bulk delete applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete applications'
    });
  }
};

// Export applications data
export const exportApplications = async (req, res) => {
  try {
    const { application_ids, format = 'csv' } = req.body;

    if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Application IDs are required'
      });
    }

    // Get applications with full details
    const applications = await JobApplication.findAll({
      where: { id: { [Op.in]: application_ids } },
      include: [
        {
          model: Job,
          as: 'job',
          include: [{
            model: EmployerProfile,
            as: 'employerProfile'
          }]
        },
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          }]
        }
      ]
    });

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No applications found'
      });
    }

    // Check permissions
    let hasPermission = true;
    const employerProfileIds = [...new Set(applications.map(app => app.job.employer_profile_id))];

    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
      hasPermission = employerProfile && employerProfileIds.every(id => id === employerProfile.id);
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          is_active: true
        }
      });
      hasPermission = teamMember && employerProfileIds.every(id => id === teamMember.employer_profile_id) && (
        teamMember.role === 'primary_owner' || 
        teamMember.permissions?.can_export_data
      );
    } else {
      hasPermission = false;
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Prepare export data
    const exportData = applications.map(app => ({
      application_id: app.id,
      candidate_name: `${app.candidateProfile.user.first_name} ${app.candidateProfile.user.last_name}`,
      candidate_email: app.candidateProfile.user.email,
      candidate_phone: app.candidateProfile.user.phone || '',
      job_title: app.job.title,
      company_name: app.job.employerProfile.company_name,
      application_status: app.status,
      applied_date: app.created_at,
      expected_salary: app.expected_salary || '',
      availability_date: app.availability_date || '',
      cover_letter_length: app.cover_letter ? app.cover_letter.length : 0,
      has_resume: app.resume_url ? 'Yes' : 'No',
      has_portfolio: app.portfolio_url ? 'Yes' : 'No',
      reviewed_date: app.reviewed_at || '',
      notes: app.notes || ''
    }));

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0]).join(',');
      const csvRows = exportData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
      );
      const csvContent = [headers, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="applications_export.csv"');
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: exportData,
        total_records: exportData.length
      });
    }
  } catch (error) {
    console.error('Export applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export applications'
    });
  }
};

// Helper function to send status update email
async function sendStatusUpdateEmail(application, status) {
  try {
    const candidate = application.candidateProfile.user;
    const job = application.job;
    const company = job.employerProfile;

    let subject, message;
    
    if (status === 'hired') {
      subject = `Congratulations! You've been selected for ${job.title}`;
      message = `Dear ${candidate.first_name},\n\nWe're excited to inform you that you have been selected for the position of ${job.title} at ${company.company_name}.\n\nWe'll be in touch soon with next steps.\n\nBest regards,\n${company.company_name} Team`;
    } else if (status === 'rejected') {
      subject = `Update on your application for ${job.title}`;
      message = `Dear ${candidate.first_name},\n\nThank you for your interest in the ${job.title} position at ${company.company_name}.\n\nAfter careful consideration, we have decided to move forward with other candidates at this time.\n\nWe appreciate the time you invested in the application process and encourage you to apply for future opportunities.\n\nBest regards,\n${company.company_name} Team`;
    }

    if (subject && message) {
      await sendEmail({
        to: candidate.email,
        subject,
        text: message,
        html: message.replace(/\n/g, '<br>')
      });
    }
  } catch (error) {
    console.error('Send status update email error:', error);
    throw error;
  }
}

// Helper function to send bulk email
async function sendBulkEmail(application, emailType, subject, message, templateId) {
  try {
    const candidate = application.candidateProfile.user;
    const job = application.job;
    const company = job.employerProfile;

    // Replace placeholders in subject and message
    const personalizedSubject = subject
      .replace(/\{candidate_name\}/g, candidate.first_name)
      .replace(/\{job_title\}/g, job.title)
      .replace(/\{company_name\}/g, company.company_name);

    const personalizedMessage = message
      .replace(/\{candidate_name\}/g, candidate.first_name)
      .replace(/\{job_title\}/g, job.title)
      .replace(/\{company_name\}/g, company.company_name);

    await sendEmail({
      to: candidate.email,
      subject: personalizedSubject,
      text: personalizedMessage,
      html: personalizedMessage.replace(/\n/g, '<br>')
    });
  } catch (error) {
    console.error('Send bulk email error:', error);
    throw error;
  }
}
