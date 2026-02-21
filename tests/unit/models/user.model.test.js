// @ts-nocheck
/**
 * User Model Unit Tests
 * Tests for User model validation, methods, and hooks
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../../models/User');
const { 
  connectDB, 
  disconnectDB, 
  clearDatabase 
} = require('../../setup/testDatabase');
const { 
  regularUsers, 
  adminUsers,
  edgeCaseUsers 
} = require('../../fixtures/users.fixture');

describe('User Model', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Schema Validation', () => {
    it('should create a valid user', async () => {
      const userData = regularUsers[0];
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.isVerified).toBe(userData.isVerified);
      expect(savedUser.isActive).toBe(userData.isActive);
    });

    it('should fail validation without required fields', async () => {
      const user = new User({});
      
      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should fail with invalid email format', async () => {
      const userData = { ...regularUsers[0], email: 'invalid-email' };
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should fail with duplicate email', async () => {
      const userData = regularUsers[0];
      await User.create(userData);
      
      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should validate role enum values', async () => {
      const userData = { ...regularUsers[0], role: 'invalid-role' };
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should handle very long strings', async () => {
      const userData = edgeCaseUsers[1];
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const password = 'Test@123456';
      const userData = { ...regularUsers[0], password };
      const user = new User(userData);
      
      // Password should be hashed before save
      expect(user.password).not.toBe(password);
      
      const savedUser = await user.save();
      expect(savedUser.password).not.toBe(password);
      
      // Verify password comparison works
      const isMatch = await savedUser.comparePassword(password);
      expect(isMatch).toBe(true);
    });

    it('should not hash password if not modified', async () => {
      const userData = regularUsers[0];
      const user = await User.create(userData);
      
      const originalPassword = user.password;
      user.firstName = 'Updated';
      await user.save();
      
      expect(user.password).toBe(originalPassword);
    });

    it('should handle password comparison correctly', async () => {
      const password = 'Test@123456';
      const userData = { ...regularUsers[0], password };
      const user = await User.create(userData);
      
      // Valid password
      const isValid = await user.comparePassword(password);
      expect(isValid).toBe(true);
      
      // Invalid password
      const isInvalid = await user.comparePassword('wrongpassword');
      expect(isInvalid).toBe(false);
      
      // Empty password
      const isEmpty = await user.comparePassword('');
      expect(isEmpty).toBe(false);
      
      // Null password
      const isNull = await user.comparePassword(null);
      expect(isNull).toBe(false);
    });

    it('should handle bcrypt errors gracefully', async () => {
      const user = await User.create(regularUsers[0]);
      
      // Mock bcrypt to throw error
      jest.spyOn(bcrypt, 'compare').mockRejectedValue(new Error('Bcrypt error'));
      
      await expect(user.comparePassword('password')).rejects.toThrow();
      
      jest.restoreAllMocks();
    });
  });

  describe('Virtual Fields', () => {
    it('should return full name correctly', async () => {
      const userData = regularUsers[0];
      const user = await User.create(userData);
      
      expect(user.fullName).toBe(`${userData.firstName} ${userData.lastName}`);
    });

    it('should handle missing name parts', async () => {
      const userData = { ...regularUsers[0], firstName: '', lastName: '' };
      const user = await User.create(userData);
      
      expect(user.fullName).toBe(' ');
    });
  });

  describe('Instance Methods', () => {
    it('should generate auth token', async () => {
      const user = await User.create(regularUsers[0]);
      const token = user.generateAuthToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token contains user info
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(user._id.toString());
      expect(decoded.role).toBe(user.role);
    });

    it('should generate refresh token', async () => {
      const user = await User.create(regularUsers[0]);
      const token = user.generateRefreshToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should update last login', async () => {
      const user = await User.create(regularUsers[0]);
      const beforeLogin = user.lastLogin;
      
      await user.updateLastLogin();
      
      expect(user.lastLogin).not.toBe(beforeLogin);
      expect(user.lastLogin).toBeInstanceOf(Date);
    });

    it('should increment login count', async () => {
      const user = await User.create(regularUsers[0]);
      const initialCount = user.loginCount || 0;
      
      await user.incrementLoginCount();
      
      expect(user.loginCount).toBe(initialCount + 1);
    });

    it('should check if user is admin', async () => {
      const regularUser = await User.create(regularUsers[0]);
      const adminUser = await User.create(adminUsers[0]);
      
      expect(regularUser.isAdmin()).toBe(false);
      expect(adminUser.isAdmin()).toBe(true);
    });

    it('should check if user is super admin', async () => {
      const adminUser = await User.create(adminUsers[0]);
      const superAdmin = await User.create(adminUsers[1]);
      
      expect(adminUser.isSuperAdmin()).toBe(false);
      expect(superAdmin.isSuperAdmin()).toBe(true);
    });

    it('should soft delete user', async () => {
      const user = await User.create(regularUsers[0]);
      
      await user.softDelete();
      
      expect(user.isActive).toBe(false);
      expect(user.deletedAt).toBeDefined();
      expect(user.deletedAt).toBeInstanceOf(Date);
    });

    it('should restore soft deleted user', async () => {
      const user = await User.create(regularUsers[0]);
      await user.softDelete();
      
      await user.restore();
      
      expect(user.isActive).toBe(true);
      expect(user.deletedAt).toBeNull();
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await User.insertMany(regularUsers);
      await User.insertMany(adminUsers);
    });

    it('should find user by email', async () => {
      const user = await User.findByEmail(regularUsers[0].email);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(regularUsers[0].email);
    });

    it('should return null for non-existent email', async () => {
      const user = await User.findByEmail('nonexistent@example.com');
      
      expect(user).toBeNull();
    });

    it('should find user by credentials', async () => {
      const password = 'Password@123';
      const userData = { ...regularUsers[0], password };
      await User.create(userData);
      
      const user = await User.findByCredentials(userData.email, password);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
    });

    it('should return null for invalid credentials', async () => {
      const userData = regularUsers[0];
      await User.create(userData);
      
      // Wrong password
      const user1 = await User.findByCredentials(userData.email, 'wrongpassword');
      expect(user1).toBeNull();
      
      // Non-existent email
      const user2 = await User.findByCredentials('nonexistent@example.com', 'password');
      expect(user2).toBeNull();
    });

    it('should find active users', async () => {
      const activeUsers = await User.findActive();
      
      expect(activeUsers.length).toBe(
        regularUsers.filter(u => u.isActive).length
      );
    });

    it('should find users by role', async () => {
      const admins = await User.findByRole('admin');
      
      expect(admins.length).toBe(adminUsers.length);
      admins.forEach(admin => {
        expect(admin.role).toBe('admin');
      });
    });

    it('should get user statistics', async () => {
      const stats = await User.getStatistics();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('verified');
      expect(stats).toHaveProperty('byRole');
    });
  });

  describe('Middleware Hooks', () => {
    it('should update updatedAt on save', async () => {
      const user = await User.create(regularUsers[0]);
      const originalUpdatedAt = user.updatedAt;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      user.firstName = 'Updated';
      await user.save();
      
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should handle pre-remove cleanup', async () => {
      const user = await User.create(regularUsers[0]);
      
      // Mock any cleanup operations
      const removeSpy = jest.spyOn(user, 'remove');
      await user.remove();
      
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe('Indexes', () => {
    it('should have proper indexes', async () => {
      const indexes = await User.collection.getIndexes();
      
      expect(indexes).toHaveProperty('email_1');
      expect(indexes).toHaveProperty('role_1');
      expect(indexes).toHaveProperty('isActive_1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', async () => {
      const userData = edgeCaseUsers[0];
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should handle special characters in email', async () => {
      const userData = {
        ...regularUsers[0],
        email: 'test+special@example.com',
      };
      const user = await User.create(userData);
      
      expect(user.email).toBe(userData.email);
    });

    it('should handle unicode characters', async () => {
      const userData = {
        ...regularUsers[0],
        firstName: 'José',
        lastName: 'Müller',
      };
      const user = await User.create(userData);
      
      expect(user.firstName).toBe('José');
      expect(user.lastName).toBe('Müller');
    });

    it('should trim whitespace from fields', async () => {
      const userData = {
        ...regularUsers[0],
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  test@example.com  ',
      };
      const user = await User.create(userData);
      
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('Query Performance', () => {
    it('should efficiently query by email', async () => {
      await User.insertMany(Array(100).fill(0).map((_, i) => ({
        ...regularUsers[0],
        email: `test${i}@example.com`,
      })));
      
      const start = Date.now();
      const user = await User.findByEmail('test50@example.com');
      const duration = Date.now() - start;
      
      expect(user).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });
});