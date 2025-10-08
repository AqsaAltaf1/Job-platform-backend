# Database Migrations

This directory contains SQL migration files for the job platform database. Migrations are numbered sequentially and should be run in order.

## Migration Files

### Core Tables
- **000_create_users_table.sql** - Creates the main users table for authentication
- **001_create_candidate_profiles_table.sql** - Creates candidate profile information
- **002_create_employer_profiles_table.sql** - Creates employer profile information
- **003_create_experiences_table.sql** - Creates work experience records
- **004_create_educations_table.sql** - Creates education records
- **005_create_projects_table.sql** - Creates project portfolio records
- **006_create_otp_table.sql** - Creates OTP table for email verification

### Enhanced Skills System
- **007_create_enhanced_skills_tables.sql** - Creates enhanced skills system tables
  - `enhanced_skills` - Skills with detailed attributes
  - `skill_evidence` - Supporting evidence for skills
  - `peer_endorsements` - Peer endorsements with ratings
  - `reviewer_invitations` - Invitations for external reviewers

### Complete Initial Schema
All tables are created with the correct structure from the start, including:
- TEXT fields for long content (profile pictures, descriptions, etc.)
- Star ratings in peer endorsements
- Skill ratings in enhanced skills
- All necessary indexes and constraints

## Running Migrations

### For Development
```bash
# Run all migrations in order
psql -d your_database_name -f 000_create_users_table.sql
psql -d your_database_name -f 001_create_candidate_profiles_table.sql
psql -d your_database_name -f 002_create_employer_profiles_table.sql
psql -d your_database_name -f 003_create_experiences_table.sql
psql -d your_database_name -f 004_create_educations_table.sql
psql -d your_database_name -f 005_create_projects_table.sql
psql -d your_database_name -f 006_create_otp_table.sql
psql -d your_database_name -f 007_create_enhanced_skills_tables.sql
```

### For Production
```bash
# Run migrations with proper error handling
for migration in 000_*.sql 001_*.sql 002_*.sql 003_*.sql 004_*.sql 005_*.sql 006_*.sql 007_*.sql; do
    echo "Running migration: $migration"
    psql -d your_database_name -f "$migration" || {
        echo "Migration failed: $migration"
        exit 1
    }
done
```

## Database Schema Overview

### Core Tables
- **users** - Main user accounts with authentication
- **candidate_profiles** - Detailed candidate information
- **employer_profiles** - Detailed employer information
- **experiences** - Work experience records
- **educations** - Education records
- **projects** - Project portfolio records
- **otps** - One-time passwords for email verification

### Enhanced Skills System
- **enhanced_skills** - Skills with ratings and metadata
- **skill_evidence** - Supporting evidence (certifications, projects, etc.)
- **peer_endorsements** - Peer endorsements with star ratings
- **reviewer_invitations** - Invitations for external skill reviews

## Notes

- All tables use UUID primary keys for better scalability
- Timestamps are stored as `TIMESTAMP WITH TIME ZONE`
- Foreign key constraints ensure data integrity
- Indexes are created for performance optimization
- All tables include `is_active` flags for soft deletion
- Enhanced skills system supports peer endorsements and evidence