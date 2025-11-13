import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const register = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Super Admin can register users' });
    }

    const { email, password, name, role, doctorData } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    let userData = {
      email,
      password: hashedPassword,
      name,
      role,
    };

    if (role === 'DOCTOR' && doctorData) {
      const user = await prisma.user.create({ data: userData });
      const doctor = await prisma.doctor.create({
        data: {
          userId: user.id,
          name: doctorData.name || name,
          specialization: doctorData.specialization,
          licenseNumber: doctorData.licenseNumber,
          phone: doctorData.phone,
          email: doctorData.email || email,
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { doctorId: doctor.id },
      });
      return res.json({ message: 'Doctor registered successfully', user, doctor });
    }

    const user = await prisma.user.create({ data: userData });
    res.json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { doctor: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        doctor: user.doctor,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { doctor: true },
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      doctor: user.doctor,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

