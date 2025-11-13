# Doctor Appointment Management System

A comprehensive clinic management system built with Next.js, React, Node.js, PostgreSQL, and Prisma.

## Features

- **Super Admin**: Full system control, can add doctors, manage users, view statistics
- **Reception/Manager**: Add patients, generate tickets, print thermal tickets
- **Patient Display Screen**: Real-time queue display for waiting area
- **Doctor Dashboard**: View patients, call next patient, manage consultations, create prescriptions, view medical history, print prescriptions
- **Laboratory Module**: Upload test reports, link to patients
- **Patient History**: Complete medical history including past visits, prescriptions, diagnoses, and lab reports

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Real-time**: Socket.IO
- **Authentication**: JWT

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Doctor-appointment-system
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/doctor_appointment_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

Generate Prisma Client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Seed the database with a Super Admin account:

```bash
npm run seed
```

This will create a Super Admin with:
- Email: `admin@clinic.com`
- Password: `admin123`

Start the backend server:

```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Login**: Navigate to `http://localhost:3000/login` and login with the Super Admin credentials
2. **Create Doctors**: As Super Admin, go to Admin Dashboard and add doctors
3. **Create Receptionist/Lab Staff**: Use the Admin Dashboard to create other users
4. **Register Patients**: Use the Reception dashboard to add patients and generate tickets
5. **View Queue**: The Display Screen shows the current queue in real-time
6. **Doctor Consultation**: Doctors can call patients, view history, create prescriptions
7. **Upload Lab Reports**: Lab staff can upload test reports for patients

## System Flow

1. Receptionist adds patient → Ticket is generated and printed
2. Patient waits → Display screen shows queue position
3. Doctor calls next patient → Display screen updates automatically
4. Doctor consults → Can view history, create prescriptions, add medical records
5. Lab uploads reports → Automatically linked to patient file
6. Doctor completes appointment → Patient history is saved

## Project Structure

```
Doctor-appointment-system/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── routes/                 # API routes
│   ├── middleware/            # Auth middleware
│   ├── scripts/                # Seed scripts
│   └── server.js               # Express server
├── frontend/
│   ├── app/                    # Next.js app directory
│   │   ├── admin/             # Super Admin dashboard
│   │   ├── doctor/            # Doctor dashboard
│   │   ├── reception/         # Reception dashboard
│   │   ├── lab/               # Lab dashboard
│   │   ├── display/           # Patient display screen
│   │   └── login/             # Login page
│   ├── Components/            # React components
│   └── lib/                   # API utilities
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (Super Admin only)
- `GET /api/auth/me` - Get current user

### Admin
- `GET /api/admin/users` - Get all users
- `POST /api/admin/doctors` - Create doctor
- `GET /api/admin/doctors` - Get all doctors
- `PUT /api/admin/doctors/:id` - Update doctor
- `DELETE /api/admin/doctors/:id` - Delete doctor
- `GET /api/admin/stats` - Get system statistics

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create patient
- `GET /api/patients/search/:query` - Search patients

### Appointments
- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/waiting` - Get waiting appointments
- `POST /api/appointments/call-next` - Call next patient
- `POST /api/appointments/:id/complete` - Complete appointment

### Lab Reports
- `GET /api/lab` - Get all lab reports
- `POST /api/lab` - Upload lab report

### Prescriptions
- `GET /api/prescriptions` - Get all prescriptions
- `POST /api/prescriptions` - Create prescription

### Medical Records
- `GET /api/medical-records` - Get all medical records
- `POST /api/medical-records` - Create medical record

### Queue
- `GET /api/queue/status` - Get queue status

## User Roles

- **SUPER_ADMIN**: Full system access, can manage all users and settings
- **DOCTOR**: Can view patients, call next, create prescriptions, view medical history
- **RECEPTIONIST**: Can add patients, generate tickets, view queue
- **LAB_STAFF**: Can upload lab reports, search patients

## Features

### Real-time Updates
- Socket.IO integration for real-time queue updates
- Display screen automatically updates when patients are called
- No page refresh needed

### Ticket Printing
- Thermal printer support (simulated in browser)
- Automatic ticket generation when patient is registered

### Medical History
- Complete patient history including:
  - Past appointments
  - Prescriptions
  - Lab reports
  - Medical records
  - Diagnoses

### Prescription Management
- Create prescriptions with medications, instructions, diagnosis
- Print prescriptions
- View prescription history

## Development

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Database Management
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

## Production Deployment

1. Set up PostgreSQL database
2. Update `.env` files with production values
3. Run database migrations
4. Build frontend: `cd frontend && npm run build`
5. Start backend: `cd backend && npm start`
6. Start frontend: `cd frontend && npm start`

## Security Notes

- Change default JWT_SECRET in production
- Use strong passwords for database
- Implement rate limiting for production
- Use HTTPS in production
- Regularly update dependencies

## License

This project is for educational purposes.

## Support

For issues or questions, please create an issue in the repository.
