// @ts-nocheck
/**
 * User Fixtures
 * Predefined test user data
 */

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const generateObjectId = () => new mongoose.Types.ObjectId();

// Regular users
const regularUsers = [
  {
    _id: generateObjectId(),
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: bcrypt.hashSync('Password@123', 10),
    role: 'user',
    isVerified: true,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    _id: generateObjectId(),
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    password: bcrypt.hashSync('Password@123', 10),
    role: 'user',
    isVerified: false,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    _id: generateObjectId(),
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@example.com',
    password: bcrypt.hashSync('Password@123', 10),
    role: 'user',
    isVerified: true,
    isActive: false,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
];

// Admin users
const adminUsers = [
  {
    _id: generateObjectId(),
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: bcrypt.hashSync('Admin@123456', 10),
    role: 'admin',
    isVerified: true,
    isActive: true,
    permissions: ['manage_users', 'manage_system', 'view_analytics'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    _id: generateObjectId(),
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@example.com',
    password: bcrypt.hashSync('SuperAdmin@123', 10),
    role: 'super_admin',
    isVerified: true,
    isActive: true,
    permissions: ['*'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Student users
const studentUsers = [
  {
    _id: generateObjectId(),
    firstName: 'Student',
    lastName: 'One',
    email: 'student1@example.com',
    password: bcrypt.hashSync('Student@123', 10),
    role: 'student',
    isVerified: true,
    isActive: true,
    profile: {
      education: [
        {
          institution: 'University of Lesotho',
          degree: 'Bachelor',
          field: 'Computer Science',
          startYear: 2020,
          endYear: 2024,
        },
      ],
      skills: ['JavaScript', 'Python', 'React'],
      experience: [],
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Company users
const companyUsers = [
  {
    _id: generateObjectId(),
    firstName: 'Company',
    lastName: 'Rep',
    email: 'company@example.com',
    password: bcrypt.hashSync('Company@123', 10),
    role: 'company',
    isVerified: true,
    isActive: true,
    companyName: 'Tech Corp',
    position: 'HR Manager',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Edge case users
const edgeCaseUsers = [
  {
    _id: generateObjectId(),
    firstName: '',
    lastName: '',
    email: 'invalid@example.com',
    password: 'weak',
    role: 'user',
    isVerified: false,
    isActive: false,
  },
  {
    _id: generateObjectId(),
    firstName: 'VeryLongName' + 'x'.repeat(100),
    lastName: 'VeryLongLastName' + 'y'.repeat(100),
    email: 'verylong@example.com',
    password: 'Password@123' + 'x'.repeat(100),
    role: 'user',
    isVerified: true,
    isActive: true,
  },
];

module.exports = {
  regularUsers,
  adminUsers,
  studentUsers,
  companyUsers,
  edgeCaseUsers,
  generateObjectId,
};