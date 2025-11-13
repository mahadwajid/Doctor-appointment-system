# Backend API - Doctor Appointment Management System

## Architecture

This backend follows a **Controller-Route** architecture pattern with ES6 modules.

### Structure

```
backend/
├── controllers/          # Business logic (controllers)
│   ├── authController.js
│   ├── adminController.js
│   ├── patientController.js
│   ├── appointmentController.js
│   ├── doctorController.js
│   ├── labController.js
│   ├── prescriptionController.js
│   ├── medicalRecordController.js
│   └── queueController.js
├── routes/              # Route definitions
│   ├── auth.js
│   ├── admin.js
│   ├── patients.js
│   ├── appointments.js
│   ├── doctors.js
│   ├── lab.js
│   ├── prescriptions.js
│   ├── medicalRecords.js
│   └── queue.js
├── middleware/          # Middleware functions
│   └── auth.js
├── prisma/              # Database schema
│   └── schema.prisma
├── scripts/             # Utility scripts
│   └── seed.js
└── server.js            # Main server file
```

## ES6 Modules

All files use ES6 import/export syntax:

```javascript
// Import
import express from 'express';
import { authenticate } from '../middleware/auth.js';

// Export
export const myFunction = async (req, res) => { ... };
export default router;
```

## Controllers

Controllers contain the business logic and are separated from routes:

```javascript
// controllers/patientController.js
export const getAllPatients = async (req, res) => {
  // Business logic here
};
```

## Routes

Routes define the endpoints and use controllers:

```javascript
// routes/patients.js
import * as patientController from '../controllers/patientController.js';

router.get('/', authenticate, patientController.getAllPatients);
```

## Running the Server

```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

## Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run seed
```

