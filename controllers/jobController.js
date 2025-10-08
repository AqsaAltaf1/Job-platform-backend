import Job from '../models/Job.js';
import JobApplication from '../models/JobApplication.js';
import { EmployerProfile } from '../models/EmployerProfile.js';
import { TeamMember } from '../models/TeamMember.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { sequelize } from '../models/index.js';
import { hasActiveSubscription, canPostJobsAsTeamMember } from '../utils/subscriptionUtils.js';

// Helper function to check if user has permission to manage jobs
const hasJobManagementPermission = async (user, jobEmployerProfileId, requiredPermission = 'can_post_jobs') => {
  if (user.role === 'employer') {
    // Employers (company owners) have full access to ALL jobs in their company
    const employerProfile = await EmployerProfile.findOne({
      where: { 
        user_id: user.id
      }
    });
    
    if (!employerProfile) return false;
    
    // Check if this job belongs to the employer's company
    return employerProfile.id === jobEmployerProfileId;
    
  } else if (user.role === 'team_member') {
    // Team members need specific permissions for the job's company
    const teamMember = await TeamMember.findOne({
      where: { 
        user_id: user.id,
        employer_profile_id: jobEmployerProfileId,
        is_active: true
      }
    });
    
    if (!teamMember) return false;
    
    // Check if user is primary owner of the team or has specific permission
    return (teamMember.role === 'primary_owner') || 
           (teamMember.permissions && teamMember.permissions[requiredPermission]);
  }
  
  return false;
};

// Get all jobs (public endpoint for job listings)
export const getAllJobs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 9, 
      search, 
      job_type, 
      work_arrangement, 
      experience_level, 
      location, 
      department,
      salary_min,
      salary_max 
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { status: 'active' };

    // Add search filters
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (job_type) whereClause.job_type = job_type;
    if (work_arrangement) whereClause.work_arrangement = work_arrangement;
    if (experience_level) whereClause.experience_level = experience_level;
    if (location) whereClause.location = { [Op.iLike]: `%${location}%` };
    if (department) whereClause.department = { [Op.iLike]: `%${department}%` };

    // Salary range filter
    if (salary_min || salary_max) {
      whereClause[Op.and] = [];
      if (salary_min) {
        whereClause[Op.and].push({
          [Op.or]: [
            { salary_min: { [Op.gte]: salary_min } },
            { salary_max: { [Op.gte]: salary_min } }
          ]
        });
      }
      if (salary_max) {
        whereClause[Op.and].push({
          [Op.or]: [
            { salary_min: { [Op.lte]: salary_max } },
            { salary_max: { [Op.lte]: salary_max } }
          ]
        });
      }
    }

    const jobs = await Job.findAndCountAll({
      where: whereClause,
      include: [{
        model: EmployerProfile,
        as: 'employerProfile',
        attributes: ['id', 'company_name', 'company_logo_url', 'company_size', 'headquarters_location']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      jobs: jobs.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(jobs.count / limit),
        totalJobs: jobs.count,
        hasNext: page * limit < jobs.count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs'
    });
  }
};

// Get single job by ID (public endpoint)
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findOne({
      where: { 
        id,
        status: { [Op.in]: ['active', 'paused'] }
      },
      include: [{
        model: EmployerProfile,
        as: 'employerProfile',
        attributes: ['id', 'company_name', 'company_display_name', 'company_logo_url', 'company_size', 'headquarters_location', 'company_sector']
      }, {
        model: User,
        as: 'postedBy',
        attributes: ['id', 'first_name', 'last_name']
      }]
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Increment view count
    await job.increment('views_count');

    res.json({
      success: true,
      job
    });
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job'
    });
  }
};

// Get jobs posted by employer (protected endpoint)
export const getEmployerJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    // Get employer profile
    const employerProfile = await EmployerProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!employerProfile) {
      return res.status(403).json({
        success: false,
        error: 'Employer profile not found'
      });
    }

    const whereClause = { employer_profile_id: employerProfile.id };
    if (status) whereClause.status = status;

    const jobs = await Job.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'postedBy',
        attributes: ['id', 'first_name', 'last_name']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      jobs: jobs.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(jobs.count / limit),
        totalJobs: jobs.count,
        hasNext: page * limit < jobs.count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get employer jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employer jobs'
    });
  }
};

// Create new job (protected endpoint - employers only)
export const createJob = async (req, res) => {
  try {
    // Check if user is employer or team member with job posting permission
    if (req.user.role !== 'employer' && req.user.role !== 'team_member') {
      return res.status(403).json({
        success: false,
        error: 'Only employers and authorized team members can post jobs'
      });
    }

    let employerProfile;
    let isTeamMember = false;
    
    if (req.user.role === 'employer') {
      employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
    } else {
      // For team members, get the employer profile from team member relationship
      const teamMember = await TeamMember.findOne({
        where: { user_id: req.user.id },
        include: [{
          model: EmployerProfile,
          as: 'employerProfile'
        }]
      });
      
      if (!teamMember) {
        return res.status(403).json({
          success: false,
          error: 'Team member profile not found'
        });
      }
      
      // Check if user is primary owner or has permission to post jobs
      const hasPermission = (teamMember.role === 'primary_owner') || 
                           (teamMember.permissions && teamMember.permissions.can_post_jobs);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to post jobs'
        });
      }
      
      employerProfile = teamMember.employerProfile;
      isTeamMember = true;
    }

    if (!employerProfile) {
      return res.status(403).json({
        success: false,
        error: 'Employer profile not found'
      });
    }

    // Check subscription requirements
    // Team members can post jobs if they have permission, but employers need subscription
    if (!isTeamMember) {
      const hasSubscription = await hasActiveSubscription(req.user.id);
      if (!hasSubscription) {
        return res.status(403).json({
          success: false,
          error: 'Active subscription required to post jobs. Please subscribe to continue.',
          requires_subscription: true
        });
      }
    }

    // Validate salary fields
    const { salary_min, salary_max } = req.body;
    const maxSalaryValue = 99999999.99; // Maximum value for DECIMAL(10,2)
    
    if (salary_min !== null && salary_min !== undefined) {
      if (salary_min < 0) {
        return res.status(400).json({
          success: false,
          error: 'Minimum salary cannot be negative'
        });
      }
      if (salary_min > maxSalaryValue) {
        return res.status(400).json({
          success: false,
          error: `Minimum salary cannot exceed ${maxSalaryValue.toLocaleString()}`
        });
      }
    }
    
    if (salary_max !== null && salary_max !== undefined) {
      if (salary_max < 0) {
        return res.status(400).json({
          success: false,
          error: 'Maximum salary cannot be negative'
        });
      }
      if (salary_max > maxSalaryValue) {
        return res.status(400).json({
          success: false,
          error: `Maximum salary cannot exceed ${maxSalaryValue.toLocaleString()}`
        });
      }
    }
    
    if (salary_min && salary_max && salary_min > salary_max) {
      return res.status(400).json({
        success: false,
        error: 'Minimum salary cannot be greater than maximum salary'
      });
    }

    const jobData = {
      ...req.body,
      employer_profile_id: employerProfile.id,
      posted_by: req.user.id
    };

    const job = await Job.create(jobData);

    const createdJob = await Job.findByPk(job.id, {
      include: [{
        model: EmployerProfile,
        as: 'employerProfile',
        attributes: ['id', 'company_name', 'company_logo_url']
      }, {
        model: User,
        as: 'postedBy',
        attributes: ['id', 'first_name', 'last_name']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      job: createdJob
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create job'
    });
  }
};

// Update job (protected endpoint - employers only)
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findByPk(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Check if user has permission to update this job
    const hasPermission = await hasJobManagementPermission(req.user, job.employer_profile_id, 'can_post_jobs');

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this job'
      });
    }

    await job.update(req.body);

    const updatedJob = await Job.findByPk(id, {
      include: [{
        model: EmployerProfile,
        as: 'employerProfile',
        attributes: ['id', 'company_name', 'company_logo_url']
      }, {
        model: User,
        as: 'postedBy',
        attributes: ['id', 'first_name', 'last_name']
      }]
    });

    res.json({
      success: true,
      message: 'Job updated successfully',
      job: updatedJob
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job'
    });
  }
};

// Delete job (protected endpoint - employers only)
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findByPk(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Check if user has permission to delete this job
    const hasPermission = await hasJobManagementPermission(req.user, job.employer_profile_id, 'can_post_jobs');

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this job'
      });
    }

    await job.destroy();

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete job'
    });
  }
};

// Get job statistics for employer dashboard
export const getJobStatistics = async (req, res) => {
  try {
    let employerProfile;
    
    if (req.user.role === 'employer') {
      employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { user_id: req.user.id },
        include: [{
          model: EmployerProfile,
          as: 'employerProfile'
        }]
      });
      employerProfile = teamMember?.employerProfile;
    }

    if (!employerProfile) {
      return res.status(403).json({
        success: false,
        error: 'Employer profile not found'
      });
    }

    const stats = await Job.findAll({
      where: { employer_profile_id: employerProfile.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('views_count')), 'total_views'],
        [sequelize.fn('SUM', sequelize.col('applications_count')), 'total_applications']
      ],
      group: ['status'],
      raw: true
    });

    const totalJobs = await Job.count({
      where: { employer_profile_id: employerProfile.id }
    });

    const totalApplications = await JobApplication.count({
      include: [{
        model: Job,
        as: 'job',
        where: { employer_profile_id: employerProfile.id }
      }]
    });

    res.json({
      success: true,
      statistics: {
        totalJobs,
        totalApplications,
        jobsByStatus: stats,
        totalViews: stats.reduce((sum, stat) => sum + parseInt(stat.total_views || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get job statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job statistics'
    });
  }
};
