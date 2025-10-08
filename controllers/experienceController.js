import { Experience, CandidateProfile } from '../models/index.js';

// Get all experiences for a user
export const getUserExperiences = async (req, res) => {
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

    const experiences = await Experience.findAll({
      where: { 
        user_profile_id: candidateProfile.id,
        is_active: true 
      },
      order: [['from_date', 'DESC']]
    });

    res.json({
      success: true,
      experiences: experiences.map(exp => exp.toJSON())
    });
  } catch (error) {
    console.error('Get experiences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch experiences'
    });
  }
};

// Create new experience
export const createExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { company_name, role, description, from_date, to_date, is_current, location } = req.body;

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

    const experience = await Experience.create({
      user_profile_id: candidateProfile.id,
      company_name,
      role,
      description,
      from_date,
      to_date: is_current ? null : to_date,
      is_current: is_current || false,
      location
    });

    res.status(201).json({
      success: true,
      message: 'Experience created successfully',
      experience: experience.toJSON()
    });
  } catch (error) {
    console.error('Create experience error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create experience'
    });
  }
};

// Update experience
export const updateExperience = async (req, res) => {
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

    const [updatedRowsCount] = await Experience.update(updateData, {
      where: { 
        id: id,
        user_profile_id: candidateProfile.id 
      }
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Experience not found'
      });
    }

    // Fetch updated experience
    const updatedExperience = await Experience.findByPk(id);

    res.json({
      success: true,
      message: 'Experience updated successfully',
      experience: updatedExperience.toJSON()
    });
  } catch (error) {
    console.error('Update experience error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update experience'
    });
  }
};

// Delete experience
export const deleteExperience = async (req, res) => {
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

    const deletedRowsCount = await Experience.destroy({
      where: { 
        id: id,
        user_profile_id: candidateProfile.id 
      }
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Experience not found'
      });
    }

    res.json({
      success: true,
      message: 'Experience deleted successfully'
    });
  } catch (error) {
    console.error('Delete experience error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete experience'
    });
  }
};
