// Add this to the candidateController.js file
export const getPublicCandidateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await User.findOne({
      where: { 
        id: id,
        role: 'candidate',
        is_active: true 
      },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: true
        }
      ]
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    res.json({
      success: true,
      candidate: {
        id: candidate.id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.candidateProfile?.location,
        availability: candidate.candidateProfile?.availability,
        bio: candidate.candidateProfile?.bio,
        profile_picture_url: candidate.candidateProfile?.profile_picture_url,
        experience_years: candidate.candidateProfile?.experience_years,
        salary_expectation: candidate.candidateProfile?.salary_expectation,
        skills: candidate.candidateProfile?.skills || [],
        created_at: candidate.created_at
      }
    });

  } catch (error) {
    console.error('Get public candidate profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get candidate profile'
    });
  }
};
