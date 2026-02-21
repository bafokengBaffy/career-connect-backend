// @ts-nocheck
/**
 * User Controller Unit Tests
 * Tests for user controller methods
 */

const httpMocks = require('node-mocks-http');
const bcrypt = require('bcryptjs');
const User = require('../../../models/User');
const userController = require('../../../controllers/userController');
const { 
  connectDB, 
  disconnectDB, 
  clearDatabase 
} = require('../../setup/testDatabase');
const { 
  generateTestUser, 
  generateTestAdmin,
  generateTestToken,
  validateResponseStructure,
  validateErrorResponse,
  maliciousPayloads 
} = require('../../setup/testUtils');

describe('User Controller', () => {
  let req, res, next;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    // Create mock request and response
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    
    // Mock response methods
    res.json = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
  });

  describe('getUsers', () => {
    it('should get all users with pagination (admin only)', async () => {
      // Create test users
      const users = await Promise.all([
        User.create(generateTestUser()),
        User.create(generateTestUser()),
        User.create(generateTestUser()),
      ]);

      req.userRole = 'admin';
      req.query = { page: 1, limit: 10 };

      await userController.getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.objectContaining({
            total: 3,
            page: 1,
            limit: 10,
          }),
        })
      );
    });

    it('should filter users by role', async () => {
      await Promise.all([
        User.create(generateTestUser({ role: 'user' })),
        User.create(generateTestUser({ role: 'admin' })),
        User.create(generateTestUser({ role: 'student' })),
      ]);

      req.userRole = 'admin';
      req.query = { role: 'admin' };

      await userController.getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.data.length).toBe(1);
      expect(response.data[0].role).toBe('admin');
    });

    it('should search users by name/email', async () => {
      await Promise.all([
        User.create(generateTestUser({ firstName: 'John', lastName: 'Doe' })),
        User.create(generateTestUser({ firstName: 'Jane', lastName: 'Smith' })),
        User.create(generateTestUser({ firstName: 'Bob', lastName: 'Johnson' })),
      ]);

      req.userRole = 'admin';
      req.query = { search: 'john' };

      await userController.getUsers(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.data.length).toBe(1);
      expect(response.data[0].firstName).toBe('John');
    });

    it('should return empty array for no matches', async () => {
      req.userRole = 'admin';
      req.query = { search: 'nonexistent' };

      await userController.getUsers(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.data.length).toBe(0);
    });

    it('should deny access to non-admin users', async () => {
      req.userRole = 'user';

      await userController.getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('not authorized'),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      req.userRole = 'admin';
      
      // Mock database error
      jest.spyOn(User, 'find').mockImplementation(() => {
        throw new Error('Database error');
      });

      await userController.getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );

      jest.restoreAllMocks();
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user profile', async () => {
      const user = await User.create(generateTestUser());
      
      req.userId = user._id.toString();

      await userController.getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            _id: user._id.toString(),
            email: user.email,
          }),
        })
      );
    });

    it('should return 404 for non-existent user', async () => {
      req.userId = new mongoose.Types.ObjectId().toString();

      await userController.getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('not found'),
        })
      );
    });

    it('should handle database errors', async () => {
      req.userId = 'invalid-id';

      await userController.getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateCurrentUser', () => {
    it('should update current user profile', async () => {
      const user = await User.create(generateTestUser());
      
      req.userId = user._id.toString();
      req.body = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+26612345678',
      };

      await userController.updateCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            firstName: 'Updated',
            lastName: 'Name',
            phone: '+26612345678',
          }),
        })
      );

      // Verify database was updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.phone).toBe('+26612345678');
    });

    it('should prevent updating restricted fields', async () => {
      const user = await User.create(generateTestUser());
      
      req.userId = user._id.toString();
      req.body = {
        role: 'admin',
        isVerified: true,
        isActive: false,
        email: 'hacked@example.com',
      };

      await userController.updateCurrentUser(req, res);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.role).toBe('user'); // Should not change
      expect(updatedUser.isVerified).toBe(false);
      expect(updatedUser.isActive).toBe(true);
      expect(updatedUser.email).not.toBe('hacked@example.com');
    });

    it('should validate input data', async () => {
      const user = await User.create(generateTestUser());
      
      req.userId = user._id.toString();
      req.body = {
        email: 'invalid-email',
        phone: 'invalid-phone',
      };

      await userController.updateCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.any(Array),
        })
      );
    });

    it('should handle XSS attempts', async () => {
      const user = await User.create(generateTestUser());
      
      req.userId = user._id.toString();
      req.body = {
        firstName: maliciousPayloads.xssPayloads[0],
        bio: maliciousPayloads.xssPayloads[1],
      };

      await userController.updateCurrentUser(req, res);

      // Check that XSS was sanitized
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.firstName).not.toContain('<script>');
      expect(updatedUser.bio).not.toContain('onerror=');
    });

    it('should handle SQL injection attempts', async () => {
      const user = await User.create(generateTestUser());
      
      req.userId = user._id.toString();
      req.body = {
        firstName: maliciousPayloads.sqlInjection[0],
      };

      await userController.updateCurrentUser(req, res);

      // Should sanitize and not crash
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('changePassword', () => {
    it('should change password with valid credentials', async () => {
      const password = 'OldPass@123';
      const user = await User.create(generateTestUser({ password }));
      
      req.userId = user._id.toString();
      req.body = {
        currentPassword: password,
        newPassword: 'NewPass@456',
        confirmPassword: 'NewPass@456',
      };

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('successfully'),
        })
      );

      // Verify password was changed
      const updatedUser = await User.findById(user._id);
      const isMatch = await bcrypt.compare('NewPass@456', updatedUser.password);
      expect(isMatch).toBe(true);
    });

    it('should reject incorrect current password', async () => {
      const user = await User.create(generateTestUser({ password: 'Correct@123' }));
      
      req.userId = user._id.toString();
      req.body = {
        currentPassword: 'Wrong@123',
        newPassword: 'NewPass@456',
        confirmPassword: 'NewPass@456',
      };

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('incorrect'),
        })
      );
    });

    it('should reject mismatched new passwords', async () => {
      const user = await User.create(generateTestUser({ password: 'Old@123' }));
      
      req.userId = user._id.toString();
      req.body = {
        currentPassword: 'Old@123',
        newPassword: 'NewPass@456',
        confirmPassword: 'Different@789',
      };

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('do not match'),
        })
      );
    });

    it('should enforce password strength', async () => {
      const user = await User.create(generateTestUser({ password: 'Old@123' }));
      
      req.userId = user._id.toString();
      req.body = {
        currentPassword: 'Old@123',
        newPassword: 'weak',
        confirmPassword: 'weak',
      };

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Password must'),
        })
      );
    });

    it('should prevent password reuse', async () => {
      const user = await User.create(generateTestUser({ password: 'Old@123' }));
      
      req.userId = user._id.toString();
      req.body = {
        currentPassword: 'Old@123',
        newPassword: 'Old@123',
        confirmPassword: 'Old@123',
      };

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('cannot be same'),
        })
      );
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user (admin only)', async () => {
      const user = await User.create(generateTestUser());
      
      req.userId = new mongoose.Types.ObjectId().toString(); // Admin ID
      req.userRole = 'admin';
      req.params = { id: user._id.toString() };

      process.env.SOFT_DELETE = 'true';

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('deactivated'),
        })
      );

      // Check soft delete
      const deletedUser = await User.findById(user._id);
      expect(deletedUser.isActive).toBe(false);
      expect(deletedUser.deletedAt).toBeDefined();
    });

    it('should hard delete user with related data', async () => {
      const user = await User.create(generateTestUser());
      
      req.userId = new mongoose.Types.ObjectId().toString();
      req.userRole = 'admin';
      req.params = { id: user._id.toString() };

      process.env.SOFT_DELETE = 'false';

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Check hard delete
      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should prevent admin from deleting themselves', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      
      req.userId = adminId;
      req.userRole = 'admin';
      req.params = { id: adminId };

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Cannot delete your own'),
        })
      );
    });

    it('should handle non-existent user', async () => {
      req.userId = new mongoose.Types.ObjectId().toString();
      req.userRole = 'admin';
      req.params = { id: new mongoose.Types.ObjectId().toString() };

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getUserStatistics', () => {
    it('should return user statistics for admin', async () => {
      // Create various users
      await Promise.all([
        User.create(generateTestUser({ role: 'user', isVerified: true })),
        User.create(generateTestUser({ role: 'user', isVerified: false })),
        User.create(generateTestUser({ role: 'admin', isVerified: true })),
        User.create(generateTestUser({ role: 'student', isVerified: true })),
        User.create(generateTestUser({ role: 'student', isVerified: false, isActive: false })),
      ]);

      req.userRole = 'admin';

      await userController.getUserStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('overview');
      expect(response.data).toHaveProperty('byRole');
      expect(response.data).toHaveProperty('trends');
      
      // Check statistics
      expect(response.data.overview.total).toBe(5);
      expect(response.data.overview.verified).toBe(3);
      expect(response.data.byRole).toBeInstanceOf(Array);
    });

    it('should deny access to non-admin users', async () => {
      req.userRole = 'user';

      await userController.getUserStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle empty database', async () => {
      req.userRole = 'admin';

      await userController.getUserStatistics(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.data.overview.total).toBe(0);
      expect(response.data.byRole).toBeInstanceOf(Array);
      expect(response.data.byRole.length).toBe(0);
    });
  });

  describe('Security & Edge Cases', () => {
    it('should handle invalid ObjectId gracefully', async () => {
      req.userId = 'invalid-id';
      req.params = { id: 'invalid-id' };

      await userController.getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should prevent parameter pollution', async () => {
      const user = await User.create(generateTestUser());
      
      req.userId = user._id.toString();
      req.body = {
        firstName: 'Valid',
        firstName: 'Hacked', // Duplicate parameter
      };

      await userController.updateCurrentUser(req, res);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.firstName).not.toBe('Hacked');
    });

    it('should handle large payloads', async () => {
      const user = await User.create(generateTestUser());
      
      req.userId = user._id.toString();
      req.body = generateLargePayload(1000); // 1000 fields

      await userController.updateCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400); // Should reject large payload
    });

    it('should handle concurrent updates', async () => {
      const user = await User.create(generateTestUser());
      
      const update1 = async () => {
        const req1 = httpMocks.createRequest({
          userId: user._id.toString(),
          body: { firstName: 'Update1' },
        });
        const res1 = httpMocks.createResponse();
        res1.json = jest.fn().mockReturnValue(res1);
        res1.status = jest.fn().mockReturnValue(res1);
        
        await userController.updateCurrentUser(req1, res1);
        return res1;
      };

      const update2 = async () => {
        const req2 = httpMocks.createRequest({
          userId: user._id.toString(),
          body: { firstName: 'Update2' },
        });
        const res2 = httpMocks.createResponse();
        res2.json = jest.fn().mockReturnValue(res2);
        res2.status = jest.fn().mockReturnValue(res2);
        
        await userController.updateCurrentUser(req2, res2);
        return res2;
      };

      await Promise.all([update1(), update2()]);

      const finalUser = await User.findById(user._id);
      expect(finalUser.firstName).toMatch(/Update/); // Either Update1 or Update2
    });
  });
});