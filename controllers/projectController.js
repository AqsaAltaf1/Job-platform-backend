import { Project, CandidateProfile } from '../models/index.js';

// Get all projects for a user
export const getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find the candidate profile for this user
    const candidateProfile = await CandidateProfile.findOne({
      where: { user_id: userId }
    });

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        error: 'Candidate profile not found'
      });
    }

    const projects = await Project.findAll({
      where: { 
        user_profile_id: candidateProfile.id,
        is_active: true 
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      projects: projects.map(project => project.toJSON())
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
};

// Create new project
export const createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, project_url, github_url, image_url, technologies, start_date, end_date } = req.body;

    // Find the candidate profile for this user
    const candidateProfile = await CandidateProfile.findOne({
      where: { user_id: userId }
    });

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        error: 'Candidate profile not found'
      });
    }

    const project = await Project.create({
      user_profile_id: candidateProfile.id,
      title,
      description,
      project_url,
      github_url,
      image_url,
      technologies: technologies || [],
      start_date,
      end_date
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: project.toJSON()
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
  }
};

// Update project
export const updateProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    // Find the candidate profile for this user
    const candidateProfile = await CandidateProfile.findOne({
      where: { user_id: userId }
    });

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        error: 'Candidate profile not found'
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.user_profile_id;
    delete updateData.created_at;
    delete updateData.updated_at;

    const [updatedRowsCount] = await Project.update(updateData, {
      where: { 
        id: id,
        user_profile_id: candidateProfile.id 
      }
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Fetch updated project
    const updatedProject = await Project.findByPk(id);

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject.toJSON()
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
};

// Delete project
export const deleteProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Find the candidate profile for this user
    const candidateProfile = await CandidateProfile.findOne({
      where: { user_id: userId }
    });

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        error: 'Candidate profile not found'
      });
    }

    const deletedRowsCount = await Project.destroy({
      where: { 
        id: id,
        user_profile_id: candidateProfile.id 
      }
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
};
