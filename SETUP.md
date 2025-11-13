# Quick Setup Guide

## Step 1: Database Setup

1. Install PostgreSQL if not already installed
2. Create a new database:
```sql
CREATE DATABASE doctor_appointment_db;
```

## Step 2: Backend Setup

```bash
cd backend
npm install
```

3. Create `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/doctor_appointment_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

4. Generate Prisma Client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Seed the database:
```bash
npm run seed
```

6. Start the backend:
```bash
npm run dev
```

## Step 3: Frontend Setup

```bash
cd frontend
npm install
```

2. Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

3. Start the frontend:
```bash
npm run dev
```

## Step 4: Login

1. Open browser: `http://localhost:3000`
2. Login with:
   - Email: `admin@clinic.com`
   - Password: `admin123`

## Step 5: Create Users

1. As Super Admin, go to Admin Dashboard
2. Add doctors, receptionists, and lab staff as needed

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running
- Verify DATABASE_URL in `.env` is correct
- Ensure database exists

### Port Already in Use
- Change PORT in backend `.env`
- Update FRONTEND_URL accordingly

### CORS Errors
- Ensure FRONTEND_URL in backend `.env` matches frontend URL

### Socket.IO Connection Issues
- Check NEXT_PUBLIC_SOCKET_URL in frontend `.env.local`
- Ensure backend is running

