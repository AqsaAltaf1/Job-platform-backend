import JobApplication from '../models/JobApplication.js';
import Job from '../models/Job.js';
import { EmployerProfile } from '../models/EmployerProfile.js';
import { TeamMember } from '../models/TeamMember.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

// Create Interview model (we'll need this)
import { sequelize } from '../models/index.js';
import { DataTypes } from 'sequelize';

const Interview = sequelize.define('Interview', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  application_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'job_applications',
      key: 'id'
    }
  },
  interviewer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 60
  },
  type: {
    type: DataTypes.ENUM('phone', 'video', 'in_person'),
    defaultValue: 'video'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  meeting_link: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'no_show'),
    defaultValue: 'scheduled'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  }
}, {
  tableName: 'interviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Get all interviews for employer
export const getEmployerInterviews = async (req, res) => {
  try {
    const userId = req.user.id;
    let employerProfileId;

    // Get employer profile ID
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: userId }
      });
      if (!employerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Employer profile not found'
        });
      }
      employerProfileId = employerProfile.id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { user_id: userId }
      });
      if (!teamMember) {
        return res.status(404).json({
          success: false,
          message: 'Team member profile not found'
        });
      }
      employerProfileId = teamMember.employer_profile_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get job IDs for this employer
    const jobIds = await Job.findAll({
      where: { employer_profile_id: employerProfileId },
      attributes: ['id']
    }).then(jobs => jobs.map(job => job.id));

    const interviews = await Interview.findAll({
      include: [
        {
          model: JobApplication,
          as: 'application',
          where: { job_id: { [Op.in]: jobIds } },
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['id', 'title']
            },
            {
              model: User,
              as: 'candidate',
              attributes: ['id', 'email', 'first_name', 'last_name']
            }
          ]
        },
        {
          model: User,
          as: 'interviewer',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['scheduled_at', 'ASC']]
    });

    const formattedInterviews = interviews.map(interview => ({
      id: interview.id,
      application_id: interview.application_id,
      candidate_name: `${interview.application.candidate.first_name} ${interview.application.candidate.last_name}`,
      candidate_email: interview.application.candidate.email,
      job_title: interview.application.job.title,
      scheduled_at: interview.scheduled_at,
      duration: interview.duration,
      type: interview.type,
      location: interview.location,
      meeting_link: interview.meeting_link,
      interviewer_id: interview.interviewer_id,
      interviewer_name: `${interview.interviewer.first_name} ${interview.interviewer.last_name}`,
      status: interview.status,
      notes: interview.notes,
      feedback: interview.feedback,
      rating: interview.rating,
      created_at: interview.created_at
    }));

    res.json({
      success: true,
      interviews: formattedInterviews
    });

  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interviews',
      error: error.message
    });
  }
};

// Get shortlisted applications ready for interview
export const getShortlistedApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    let employerProfileId;

    // Get employer profile ID
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: userId }
      });
      if (!employerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Employer profile not found'
        });
      }
      employerProfileId = employerProfile.id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { user_id: userId }
      });
      if (!teamMember) {
        return res.status(404).json({
          success: false,
          message: 'Team member profile not found'
        });
      }
      employerProfileId = teamMember.employer_profile_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const applications = await JobApplication.findAll({
      where: { 
        status: { [Op.in]: ['shortlisted', 'interview'] }
      },
      include: [
        {
          model: Job,
          as: 'job',
          where: { employer_profile_id: employerProfileId },
          attributes: ['id', 'title']
        },
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'email', 'first_name', 'last_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formattedApplications = applications.map(app => ({
      id: app.id,
      candidate_name: `${app.candidate.first_name} ${app.candidate.last_name}`,
      candidate_email: app.candidate.email,
      job_title: app.job.title,
      job_id: app.job.id,
      status: app.status,
      applied_at: app.created_at
    }));

    res.json({
      success: true,
      applications: formattedApplications
    });

  } catch (error) {
    console.error('Error fetching shortlisted applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

// Schedule an interview
export const scheduleInterview = async (req, res) => {
  try {
    const {
      application_id,
      scheduled_at,
      duration,
      type,
      location,
      meeting_link,
      notes
    } = req.body;

    // Verify the application exists and belongs to this employer
    const application = await JobApplication.findOne({
      where: { id: application_id },
      include: [{
        model: Job,
        as: 'job',
        include: [{
          model: EmployerProfile,
          as: 'employerProfile'
        }]
      }]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user has permission to schedule interviews for this job
    let hasPermission = false;
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
      hasPermission = employerProfile && employerProfile.id === application.job.employer_profile_id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          employer_profile_id: application.job.employer_profile_id
        }
      });
      hasPermission = teamMember && (
        teamMember.role === 'primary_owner' || 
        teamMember.permissions?.can_interview_candidates
      );
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to schedule interviews for this job'
      });
    }

    // Create the interview
    const interview = await Interview.create({
      application_id,
      interviewer_id: req.user.id,
      scheduled_at,
      duration: duration || 60,
      type: type || 'video',
      location,
      meeting_link,
      notes
    });

    // Update application status to 'interview'
    await application.update({ 
      status: 'interview',
      interview_scheduled_at: scheduled_at
    });

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      interview: {
        id: interview.id,
        scheduled_at: interview.scheduled_at,
        duration: interview.duration,
        type: interview.type
      }
    });

  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview',
      error: error.message
    });
  }
};

// Update interview status
export const updateInterviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback, rating } = req.body;

    const interview = await Interview.findByPk(id, {
      include: [{
        model: JobApplication,
        as: 'application',
        include: [{
          model: Job,
          as: 'job'
        }]
      }]
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    // Check permissions
    let hasPermission = false;
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
      hasPermission = employerProfile && employerProfile.id === interview.application.job.employer_profile_id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          employer_profile_id: interview.application.job.employer_profile_id
        }
      });
      hasPermission = teamMember && (
        teamMember.role === 'primary_owner' || 
        teamMember.permissions?.can_interview_candidates
      );
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this interview'
      });
    }

    // Update interview
    const updateData = { status };
    if (feedback) updateData.feedback = feedback;
    if (rating) updateData.rating = rating;

    await interview.update(updateData);

    // Update application status based on interview outcome
    if (status === 'completed' && rating && rating >= 4) {
      await interview.application.update({ status: 'hired' });
    } else if (status === 'completed' && rating && rating < 3) {
      await interview.application.update({ status: 'rejected' });
    }

    res.json({
      success: true,
      message: 'Interview status updated successfully'
    });

  } catch (error) {
    console.error('Error updating interview status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update interview status',
      error: error.message
    });
  }
};
