import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const VerifiedEmployment = sequelize.define('VerifiedEmployment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    candidate_profile_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    employment_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    responsibilities: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verification_status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'NOT_VERIFIED',
    },
    verification_method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verifier_contact_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verifier_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    review_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    review_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    evidence_urls: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    evidence_text_extracted: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verified_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'verified_employments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return VerifiedEmployment;
};


