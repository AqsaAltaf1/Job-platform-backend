import { Education, CandidateProfile } from '../models/index.js';

// Get all educations for a user
export const getUserEducations = async (req, res) => {
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

    const educations = await Education.findAll({
      where: { 
        user_profile_id: candidateProfile.id,
        is_active: true 
      },
      order: [['start_date', 'DESC']]
    });

    res.json({
      success: true,
      educations: educations.map(edu => edu.toJSON())
    });
  } catch (error) {
    console.error('Get educations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch educations'
    });
  }
};

// Create new education
export const createEducation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { institution_name, degree, field_of_study, description, start_date, end_date, is_current, location, gpa, activities } = req.body;

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

    const education = await Education.create({
      user_profile_id: candidateProfile.id,
      institution_name,
      degree,
      field_of_study,
      description,
      start_date,
      end_date: is_current ? null : end_date,
      is_current: is_current || false,
      location,
      gpa,
      activities
    });

    res.status(201).json({
      success: true,
      message: 'Education created successfully',
      education: education.toJSON()
    });
  } catch (error) {
    console.error('Create education error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create education'
    });
  }
};

// Update education
export const updateEducation = async (req, res) => {
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

    const [updatedRowsCount] = await Education.update(updateData, {
      where: { 
        id: id,
        user_profile_id: candidateProfile.id 
      }
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Education not found'
      });
    }

    // Fetch updated education
    const updatedEducation = await Education.findByPk(id);

    res.json({
      success: true,
      message: 'Education updated successfully',
      education: updatedEducation.toJSON()
    });
  } catch (error) {
    console.error('Update education error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update education'
    });
  }
};

// Delete education
export const deleteEducation = async (req, res) => {
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

    const deletedRowsCount = await Education.destroy({
      where: { 
        id: id,
        user_profile_id: candidateProfile.id 
      }
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Education not found'
      });
    }

    res.json({
      success: true,
      message: 'Education deleted successfully'
    });
  } catch (error) {
    console.error('Delete education error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete education'
    });
  }
};
