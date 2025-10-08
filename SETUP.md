# Backend Setup Instructions

## 1. Environment Configuration

Create a `.env` file in the backend directory with the following content:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job
DB_USER=job
DB_PASSWORD=job123

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_EXPIRES_IN=24h

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## 2. Database Setup

The PostgreSQL database should already be created with:
- Database name: `job`
- Username: `job`
- Password: `job123`

## 3. Install Dependencies

```bash
npm install
```

## 4. Initialize Database

```bash
npm run init-db
```

This will:
- Create the users table
- Create default users:
  - Super Admin: admin@jobportal.com / admin123
  - Employer: employer@techcorp.com / employer123
  - Candidate: candidate@example.com / candidate123

## 5. Start Server

```bash
npm start
# or for development
npm run dev
```

## 6. API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile (requires auth)

### User Management (Super Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Health Check
- `GET /health` - Check database connection

## 7. User Roles

- **super_admin**: Full access to all operations
- **employer**: Can manage jobs and view candidates
- **candidate**: Can apply for jobs and manage profile

## 8. JWT Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 9. Test the API

```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jobportal.com","password":"admin123"}'

# Test protected route (use token from login response)
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/auth/profile
```
