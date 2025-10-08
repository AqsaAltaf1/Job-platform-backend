import SavedJob from '../models/SavedJob.js';
import Job from '../models/Job.js';
import { EmployerProfile } from '../models/EmployerProfile.js';
import User from '../models/User.js';

// Save a job for later
export const saveJob = async (req, res) => {
  try {
    const { job_id } = req.params;
    const candidate_id = req.user.id;
    const { notes } = req.body;

    // Check if user is a candidate
    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can save jobs'
      });
    }

    // Check if job exists
    const job = await Job.findByPk(job_id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if job is already saved
    const existingSavedJob = await SavedJob.findOne({
      where: { candidate_id, job_id }
    });

    if (existingSavedJob) {
      return res.status(400).json({
        success: false,
        message: 'Job is already saved'
      });
    }

    // Save the job
    const savedJob = await SavedJob.create({
      candidate_id,
      job_id,
      notes: notes || null
    });

    res.status(201).json({
      success: true,
      message: 'Job saved successfully',
      data: savedJob
    });

  } catch (error) {
    console.error('Error saving job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save job',
      error: error.message
    });
  }
};

// Remove a saved job
export const unsaveJob = async (req, res) => {
  try {
    const { job_id } = req.params;
    const candidate_id = req.user.id;

    // Check if user is a candidate
    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can unsave jobs'
      });
    }

    // Find and delete the saved job
    const savedJob = await SavedJob.findOne({
      where: { candidate_id, job_id }
    });

    if (!savedJob) {
      return res.status(404).json({
        success: false,
        message: 'Saved job not found'
      });
    }

    await savedJob.destroy();

    res.json({
      success: true,
      message: 'Job removed from saved jobs'
    });

  } catch (error) {
    console.error('Error unsaving job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsave job',
      error: error.message
    });
  }
};

// Get all saved jobs for a candidate
export const getSavedJobs = async (req, res) => {
  try {
    const candidate_id = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Check if user is a candidate
    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can view saved jobs'
      });
    }

    const { count, rows: savedJobs } = await SavedJob.findAndCountAll({
      where: { candidate_id },
      include: [
        {
          model: Job,
          as: 'job',
          include: [
            {
              model: EmployerProfile,
              as: 'employerProfile',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'email']
                }
              ]
            }
          ]
        }
      ],
      order: [['saved_at', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        savedJobs,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved jobs',
      error: error.message
    });
  }
};

// Check if a job is saved by the current user
export const checkJobSaved = async (req, res) => {
  try {
    const { job_id } = req.params;
    const candidate_id = req.user.id;

    // Only candidates can have saved jobs
    if (req.user.role !== 'candidate') {
      return res.json({
        success: true,
        data: { isSaved: false }
      });
    }

    const savedJob = await SavedJob.findOne({
      where: { candidate_id, job_id }
    });

    res.json({
      success: true,
      data: { isSaved: !!savedJob }
    });

  } catch (error) {
    console.error('Error checking saved job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check saved job status',
      error: error.message
    });
  }
};

// Update notes for a saved job
export const updateSavedJobNotes = async (req, res) => {
  try {
    const { job_id } = req.params;
    const candidate_id = req.user.id;
    const { notes } = req.body;

    // Check if user is a candidate
    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can update saved job notes'
      });
    }

    const savedJob = await SavedJob.findOne({
      where: { candidate_id, job_id }
    });

    if (!savedJob) {
      return res.status(404).json({
        success: false,
        message: 'Saved job not found'
      });
    }

    savedJob.notes = notes;
    await savedJob.save();

    res.json({
      success: true,
      message: 'Saved job notes updated successfully',
      data: savedJob
    });

  } catch (error) {
    console.error('Error updating saved job notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update saved job notes',
      error: error.message
    });
  }
};
