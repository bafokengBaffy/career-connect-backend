// @ts-nocheck
// backend/models/User.js

// IMPORTANT: If you have an isFeatured property in your user data,
// make sure there's no method named isFeatured in this class
// The warning indicates a naming conflict

// If you find a method named isFeatured, rename it to something like:
// - checkIsFeatured()
// - getFeaturedStatus()
// - isUserFeatured()
// @ts-nocheck
const { usersCollection, db } = require("../config/firebase");
const { admin } = require("../config/firebase");

class User {
  /**
   * @param {Object} data - User data
   */
  constructor(data) {
    this.id = data.id || null;
    this.firebaseUID = data.firebaseUID || null;
    this.userType = data.userType || "student";
    this.role = data.role || data.userType || "student"; // Ensure role exists
    this.fullName = data.fullName || "";
    this.email = data.email || "";
    this.isVerified = data.isVerified || false;
    this.status = data.status || "active"; // active, suspended, deleted
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.lastLogin = data.lastLogin || null;
    this.loginCount = data.loginCount || 0;
    this.profile = data.profile || {};
    this.preferences = data.preferences || {};
  }

  // Convert to plain object for Firestore
  toObject() {
    return {
      firebaseUID: this.firebaseUID,
      userType: this.userType,
      role: this.role,
      fullName: this.fullName,
      email: this.email,
      isVerified: this.isVerified,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin,
      loginCount: this.loginCount,
      profile: this.profile,
      preferences: this.preferences,
    };
  }

  // Validate user data
  validate() {
    const errors = [];

    if (!this.email || !this.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (!this.fullName || this.fullName.length < 2) {
      errors.push('Full name must be at least 2 characters');
    }

    if (!['student', 'employer', 'admin'].includes(this.role)) {
      errors.push('Invalid user role');
    }

    if (!['active', 'suspended', 'deleted'].includes(this.status)) {
      errors.push('Invalid user status');
    }

    return errors;
  }

  // Save user to Firestore
  async save() {
    try {
      // Validate before saving
      const errors = this.validate();
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      let userRef;
      const now = new Date().toISOString();
      this.updatedAt = now;

      if (this.id) {
        // Update existing user
        userRef = usersCollection.doc(this.id);
        await userRef.update({
          ...this.toObject(),
          updatedAt: now,
        });
      } else {
        // Create new user
        userRef = usersCollection.doc();
        const userData = this.toObject();
        userData.createdAt = now;
        userData.updatedAt = now;
        
        await userRef.set(userData);
        this.id = userRef.id;
      }

      return this;
    } catch (error) {
      console.error("Error saving user:", error);
      throw new Error(`Error saving user: ${error.message}`);
    }
  }

  // Update login statistics
  async updateLoginStats() {
    try {
      this.lastLogin = new Date().toISOString();
      this.loginCount = (this.loginCount || 0) + 1;
      await this.save();
      return this;
    } catch (error) {
      console.error("Error updating login stats:", error);
      throw error;
    }
  }

  // Static methods

  // Find user by ID
  static async findById(id) {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      const userDoc = await usersCollection.doc(id).get();

      if (!userDoc.exists) {
        return null;
      }

      return new User({
        id: userDoc.id,
        ...userDoc.data(),
      });
    } catch (error) {
      console.error("Error finding user by ID:", error);
      return null;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      const snapshot = await usersCollection
        .where("email", "==", email.toLowerCase().trim())
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const userDoc = snapshot.docs[0];
      return new User({
        id: userDoc.id,
        ...userDoc.data(),
      });
    } catch (error) {
      console.error("Error finding user by email:", error);
      return null;
    }
  }

  // Find user by Firebase UID
  static async findByFirebaseUID(firebaseUID) {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      const snapshot = await usersCollection
        .where("firebaseUID", "==", firebaseUID)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const userDoc = snapshot.docs[0];
      return new User({
        id: userDoc.id,
        ...userDoc.data(),
      });
    } catch (error) {
      console.error("Error finding user by Firebase UID:", error);
      return null;
    }
  }

  // Find all users (admin only)
  static async findAll(limit = 50, startAfter = null) {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      let query = usersCollection
        .orderBy("createdAt", "desc")
        .limit(limit);

      if (startAfter) {
        const startDoc = await usersCollection.doc(startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      const snapshot = await query.get();

      return snapshot.docs.map(
        (doc) =>
          new User({
            id: doc.id,
            ...doc.data(),
          })
      );
    } catch (error) {
      console.error("Error finding all users:", error);
      return [];
    }
  }

  // Find users by role
  static async findByRole(role, limit = 50) {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      const snapshot = await usersCollection
        .where("role", "==", role)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map(
        (doc) =>
          new User({
            id: doc.id,
            ...doc.data(),
          })
      );
    } catch (error) {
      console.error("Error finding users by role:", error);
      return [];
    }
  }

  // Delete user (soft delete)
  async softDelete() {
    try {
      this.status = 'deleted';
      this.updatedAt = new Date().toISOString();
      await this.save();
      return true;
    } catch (error) {
      console.error("Error soft deleting user:", error);
      throw error;
    }
  }

  // Permanently delete user
  async permanentDelete() {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      await usersCollection.doc(this.id).delete();
      
      // Also delete from Firebase Auth if needed
      if (this.firebaseUID) {
        try {
          const { auth } = require("../config/firebase");
          await auth.deleteUser(this.firebaseUID);
        } catch (authError) {
          console.error("Error deleting from Firebase Auth:", authError);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error permanently deleting user:", error);
      throw error;
    }
  }

  // Suspend user
  async suspend() {
    try {
      this.status = 'suspended';
      this.updatedAt = new Date().toISOString();
      await this.save();
      
      // Also disable in Firebase Auth
      if (this.firebaseUID) {
        try {
          const { auth } = require("../config/firebase");
          await auth.updateUser(this.firebaseUID, { disabled: true });
        } catch (authError) {
          console.error("Error disabling Firebase Auth user:", authError);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error suspending user:", error);
      throw error;
    }
  }

  // Reactivate user
  async reactivate() {
    try {
      this.status = 'active';
      this.updatedAt = new Date().toISOString();
      await this.save();
      
      // Re-enable in Firebase Auth
      if (this.firebaseUID) {
        try {
          const { auth } = require("../config/firebase");
          await auth.updateUser(this.firebaseUID, { disabled: false });
        } catch (authError) {
          console.error("Error enabling Firebase Auth user:", authError);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error reactivating user:", error);
      throw error;
    }
  }

  // Count total users
  static async count(role = null) {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      let query = usersCollection;
      if (role) {
        query = query.where("role", "==", role);
      }

      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      console.error("Error counting users:", error);
      return 0;
    }
  }
}

module.exports = User;