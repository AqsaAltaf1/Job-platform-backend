import JobApplication from '../models/JobApplication.js';
import Job from '../models/Job.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { EmployerProfile } from '../models/EmployerProfile.js';
import { TeamMember } from '../models/TeamMember.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { hasActiveSubscription } from '../utils/subscriptionUtils.js';

// Apply for a job (protected endpoint - candidates only)
export const applyForJob = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        error: 'Only candidates can apply for jobs'
      });
    }

    // Check if user has active subscription
    const hasSubscription = await hasActiveSubscription(req.user.id);
    if (!hasSubscription) {
      return res.status(403).json({
        success: false,
        error: 'Active subscription required to apply for jobs. Please subscribe to continue.',
        requires_subscription: true
      });
    }

    const { job_id } = req.params;
    const { cover_letter, expected_salary, availability_date, screening_answers } = req.body;

    // Check if job exists and is active
    const job = await Job.findOne({
      where: { 
        id: job_id,
        status: 'active'
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or not accepting applications'
      });
    }

    // Check if application deadline has passed
    if (job.application_deadline && new Date() > job.application_deadline) {
      return res.status(400).json({
        success: false,
        error: 'Application deadline has passed'
      });
    }

    // Get candidate profile
    const candidateProfile = await CandidateProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!candidateProfile) {
      return res.status(400).json({
        success: false,
        error: 'Please complete your candidate profile before applying'
      });
    }

    // Check if already applied
    const existingApplication = await JobApplication.findOne({
      where: {
        job_id,
        candidate_id: req.user.id
      }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'You have already applied for this job'
      });
    }

    // Create application
    const application = await JobApplication.create({
      job_id,
      candidate_id: req.user.id,
      candidate_profile_id: candidateProfile.id,
      cover_letter,
      expected_salary,
      availability_date,
      screening_answers: screening_answers || {}
    });

    const createdApplication = await JobApplication.findByPk(application.id, {
      include: [{
        model: Job,
        as: 'job',
        attributes: ['id', 'title'],
        include: [{
          model: EmployerProfile,
          as: 'employerProfile',
          attributes: ['company_name']
        }]
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: createdApplication
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application'
    });
  }
};

// Get candidate's applications (protected endpoint - candidates only)
export const getCandidateApplications = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { candidate_id: req.user.id };
    if (status) whereClause.status = status;

    const applications = await JobApplication.findAndCountAll({
      where: whereClause,
      include: [{
        model: Job,
        as: 'job',
        attributes: ['id', 'title', 'job_type', 'work_arrangement', 'location', 'salary_min', 'salary_max'],
        include: [{
          model: EmployerProfile,
          as: 'employerProfile',
          attributes: ['id', 'company_name', 'company_logo_url']
        }]
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      applications: applications.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(applications.count / limit),
        totalApplications: applications.count,
        hasNext: page * limit < applications.count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get candidate applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications'
    });
  }
};

// Get applications for a specific job (protected endpoint - employers only)
export const getJobApplications = async (req, res) => {
  try {
    const { job_id } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    // Check if user has active subscription
    const hasSubscription = await hasActiveSubscription(req.user.id);
    if (!hasSubscription) {
      return res.status(403).json({
        success: false,
        error: 'Active subscription required to view application profiles. Please subscribe to continue.',
        requires_subscription: true
      });
    }

    // Check if user has permission to view applications for this job
    const job = await Job.findByPk(job_id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    let hasPermission = false;
    
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { 
          user_id: req.user.id,
          id: job.employer_profile_id 
        }
      });
      hasPermission = !!employerProfile;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          employer_profile_id: job.employer_profile_id
        }
      });
      hasPermission = teamMember && teamMember.permissions?.can_view_applications;
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view applications for this job'
      });
    }

    const whereClause = { job_id };
    if (status) whereClause.status = status;

    const applications = await JobApplication.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'candidate',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }, {
        model: CandidateProfile,
        as: 'candidateProfile',
        attributes: ['id', 'job_title', 'experience_years', 'skills', 'location']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      applications: applications.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(applications.count / limit),
        totalApplications: applications.count,
        hasNext: page * limit < applications.count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job applications'
    });
  }
};

// Get single application details (protected endpoint)
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await JobApplication.findByPk(id, {
      include: [{
        model: Job,
        as: 'job',
        attributes: ['id', 'title', 'employer_profile_id'],
        include: [{
          model: EmployerProfile,
          as: 'employerProfile',
          attributes: ['id', 'company_name', 'company_logo_url']
        }]
      }, {
        model: User,
        as: 'candidate',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }, {
        model: CandidateProfile,
        as: 'candidateProfile'
      }]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check permissions
    let hasPermission = false;
    
    if (req.user.role === 'candidate' && application.candidate_id === req.user.id) {
      hasPermission = true;
    } else if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { 
          user_id: req.user.id,
          id: application.job.employer_profile_id 
        }
      });
      hasPermission = !!employerProfile;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          employer_profile_id: application.job.employer_profile_id
        }
      });
      hasPermission = teamMember && teamMember.permissions?.can_view_applications;
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this application'
      });
    }

    res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Get application by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application'
    });
  }
};

// Update application status (protected endpoint - employers only)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, rating, interview_scheduled_at, interview_notes } = req.body;

    const application = await JobApplication.findByPk(id, {
      include: [{
        model: Job,
        as: 'job',
        attributes: ['id', 'employer_profile_id']
      }]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check permissions
    let hasPermission = false;
    
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { 
          user_id: req.user.id,
          id: application.job.employer_profile_id 
        }
      });
      hasPermission = !!employerProfile;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          employer_profile_id: application.job.employer_profile_id
        }
      });
      hasPermission = teamMember && teamMember.permissions?.can_interview_candidates;
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this application'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    if (rating) updateData.rating = rating;
    if (interview_scheduled_at) updateData.interview_scheduled_at = interview_scheduled_at;
    if (interview_notes) updateData.interview_notes = interview_notes;

    // Set reviewed info if status is being updated
    if (status && application.status === 'pending') {
      updateData.reviewed_by = req.user.id;
      updateData.reviewed_at = new Date();
    }

    await application.update(updateData);

    const updatedApplication = await JobApplication.findByPk(id, {
      include: [{
        model: Job,
        as: 'job',
        attributes: ['id', 'title']
      }, {
        model: User,
        as: 'candidate',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }]
    });

    res.json({
      success: true,
      message: 'Application updated successfully',
      application: updatedApplication
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update application'
    });
  }
};

// Withdraw application (protected endpoint - candidates only)
export const withdrawApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await JobApplication.findOne({
      where: {
        id,
        candidate_id: req.user.id
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    if (application.status === 'withdrawn') {
      return res.status(400).json({
        success: false,
        error: 'Application is already withdrawn'
      });
    }

    if (['hired', 'offered'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot withdraw application at this stage'
      });
    }

    await application.update({ status: 'withdrawn' });

    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw application'
    });
  }
};

// Get all applications for employer (for pipeline management)
export const getAllApplicationsForEmployer = async (req, res) => {
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
          attributes: ['id', 'email', 'first_name', 'last_name'],
          include: [{
            model: CandidateProfile,
            as: 'candidateProfile',
            attributes: ['phone', 'location', 'experience_years']
          }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formattedApplications = applications.map(app => ({
      id: app.id,
      candidate_id: app.candidate_id,
      candidate_name: `${app.candidate.first_name} ${app.candidate.last_name}`,
      candidate_email: app.candidate.email,
      candidate_phone: app.candidate.candidateProfile?.phone,
      candidate_location: app.candidate.candidateProfile?.location,
      job_id: app.job.id,
      job_title: app.job.title,
      status: app.status,
      applied_at: app.created_at,
      cover_letter: app.cover_letter,
      expected_salary: app.expected_salary,
      rating: app.rating,
      employer_notes: app.employer_notes,
      interview_scheduled_at: app.interview_scheduled_at,
      resume_url: app.resume_url,
      experience_years: app.candidate.candidateProfile?.experience_years
    }));

    res.json({
      success: true,
      applications: formattedApplications
    });

  } catch (error) {
    console.error('Error fetching all applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};
