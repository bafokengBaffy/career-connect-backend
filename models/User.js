const { usersCollection } = require("../config/firebase");

class User {
  constructor(data) {
    this.id = data.id;
    this.firebaseUID = data.firebaseUID; // Firebase Authentication UID
    this.userType = data.userType || "student";
    this.fullName = data.fullName;
    this.email = data.email;
    this.isVerified = data.isVerified || false;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.profile = data.profile || {};
  }

  // Convert to plain object
  toObject() {
    return {
      firebaseUID: this.firebaseUID,
      userType: this.userType,
      fullName: this.fullName,
      email: this.email,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      profile: this.profile,
    };
  }

  // Save user to Firestore
  async save() {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      let userRef;

      if (this.id) {
        // Update existing user
        userRef = usersCollection.doc(this.id);
        await userRef.update({
          ...this.toObject(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new user
        userRef = usersCollection.doc();
        await userRef.set(this.toObject());
        this.id = userRef.id;
      }

      return this;
    } catch (error) {
      console.error("Error saving user:", error);
      throw new Error(`Error saving user: ${error.message}`);
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
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      const snapshot = await usersCollection
        .where("email", "==", email.toLowerCase())
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
      throw new Error(`Error finding user by email: ${error.message}`);
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
      throw new Error(`Error finding user by Firebase UID: ${error.message}`);
    }
  }

  // Find all users (for admin purposes)
  static async findAll(limit = 50) {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      const snapshot = await usersCollection
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
      console.error("Error finding all users:", error);
      throw new Error(`Error finding all users: ${error.message}`);
    }
  }

  // Delete user
  async delete() {
    try {
      if (!usersCollection) {
        throw new Error("Firebase users collection not initialized");
      }

      await usersCollection.doc(this.id).delete();
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // Update user profile
  async updateProfile(profileData) {
    try {
      this.profile = { ...this.profile, ...profileData };
      this.updatedAt = new Date().toISOString();
      await this.save();
      return this;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw new Error(`Error updating user profile: ${error.message}`);
    }
  }

  // Verify user email
  async verifyEmail() {
    try {
      this.isVerified = true;
      this.updatedAt = new Date().toISOString();
      await this.save();
      return this;
    } catch (error) {
      console.error("Error verifying email:", error);
      throw new Error(`Error verifying email: ${error.message}`);
    }
  }
}

module.exports = User;
