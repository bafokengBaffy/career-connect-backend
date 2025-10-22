const admin = require("firebase-admin");

let db = null;
let auth = null;
let storage = null;
let firebaseInitialized = false;

const initializeFirebase = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    try {
      const serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key: privateKey.replace(/\\n/g, "\n"),
        client_email: clientEmail,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      };

      // Check if already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: `https://${projectId}.firebaseio.com`,
          storageBucket: `${projectId}.appspot.com`,
        });
      }

      db = admin.firestore();
      auth = admin.auth();
      storage = admin.storage();

      console.log("✅ Firebase Admin initialized successfully");
      console.log(`📁 Project: ${projectId}`);
      console.log(`👤 Service Account: ${clientEmail}`);

      firebaseInitialized = true;
      return true;
    } catch (error) {
      console.error("❌ Firebase Admin initialization error:", error.message);
      return false;
    }
  } else {
    console.log("⚠️  Firebase credentials not fully configured.");
    return false;
  }
};

const isInitialized = initializeFirebase();

// Initialize Firestore Database Structure
const initializeFirestore = async () => {
  if (!firebaseInitialized || !db) {
    console.log("❌ Firebase not initialized, cannot setup Firestore");
    return false;
  }

  try {
    console.log("🔄 Initializing Firestore database structure...");

    // Create initial collections with sample data
    const batch = db.batch();

    // System configuration collection
    const systemConfigRef = db.collection("system").doc("configuration");
    batch.set(systemConfigRef, {
      appName: "Career Connect Lesotho",
      version: "1.0.0",
      initialized: true,
      initializedAt: new Date(),
      lastUpdated: new Date(),
    });

    // Create sample institutions
    const institutions = [
      {
        id: "nul",
        name: "National University of Lesotho",
        type: "university",
        location: "Roma",
        description: "Premier higher education institution in Lesotho",
        contact: {
          email: "info@nul.ls",
          phone: "+266 2221 0000",
          address: "Roma, Lesotho",
        },
        isVerified: true,
        createdAt: new Date(),
        faculties: [
          "Science & Technology",
          "Humanities",
          "Education",
          "Health Sciences",
        ],
      },
      {
        id: "limkokwing",
        name: "Limkokwing University",
        type: "university",
        location: "Maseru",
        description:
          "Creative innovation university focusing on technology and design",
        contact: {
          email: "info@limkokwing.ls",
          phone: "+266 2231 2356",
          address: "Maseru, Lesotho",
        },
        isVerified: true,
        createdAt: new Date(),
        faculties: [
          "Information Technology",
          "Business",
          "Creative Arts",
          "Communication",
        ],
      },
    ];

    institutions.forEach((inst) => {
      const instRef = db.collection("institutions").doc(inst.id);
      batch.set(instRef, inst);
    });

    // Create sample courses
    const courses = [
      {
        id: "cs-nul-001",
        name: "Bachelor of Science in Computer Science",
        institutionId: "nul",
        faculty: "Science & Technology",
        duration: "4 years",
        requirements: {
          minGrade: "C",
          subjects: ["Mathematics", "Physical Science"],
          description: "Minimum C grade in Mathematics and Physical Science",
        },
        fees: 15000,
        seats: 50,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "bit-limkokwing-001",
        name: "Bachelor in Business Information Technology",
        institutionId: "limkokwing",
        faculty: "Information Technology",
        duration: "3 years",
        requirements: {
          minGrade: "D",
          subjects: ["Mathematics", "English"],
          description: "Minimum D grade in Mathematics and English",
        },
        fees: 18000,
        seats: 40,
        isActive: true,
        createdAt: new Date(),
      },
    ];

    courses.forEach((course) => {
      const courseRef = db.collection("courses").doc(course.id);
      batch.set(courseRef, course);
    });

    // Create sample companies
    const companies = [
      {
        id: "standard-bank",
        name: "Standard Bank Lesotho",
        industry: "Banking & Finance",
        description: "Leading financial services provider in Lesotho",
        contact: {
          email: "careers@standardbank.ls",
          phone: "+266 2231 2000",
          address: "Maseru, Lesotho",
        },
        isApproved: true,
        createdAt: new Date(),
      },
      {
        id: "vodacom-lesotho",
        name: "Vodacom Lesotho",
        industry: "Telecommunications",
        description: "Leading mobile telecommunications company",
        contact: {
          email: "hr@vodacom.co.ls",
          phone: "+266 2231 3500",
          address: "Maseru, Lesotho",
        },
        isApproved: true,
        createdAt: new Date(),
      },
    ];

    companies.forEach((company) => {
      const companyRef = db.collection("companies").doc(company.id);
      batch.set(companyRef, company);
    });

    // Commit the batch
    await batch.commit();
    console.log("✅ Firestore database structure initialized successfully");
    console.log(
      "📊 Created: system, institutions, courses, companies collections"
    );

    return true;
  } catch (error) {
    console.error("❌ Firestore initialization error:", error);
    return false;
  }
};

// Test Firebase connection
const testFirebaseConnection = async () => {
  if (firebaseInitialized) {
    try {
      console.log("🔄 Testing Firebase connections...");

      // Test Firestore connection
      try {
        const testDoc = db.collection("system").doc("connection-test");
        await testDoc.set({
          test: true,
          timestamp: new Date(),
          message: "Firestore connection test",
        });
        await testDoc.delete();
        console.log("✅ Firebase Firestore connection test passed");

        // Initialize database structure
        await initializeFirestore();
      } catch (firestoreError) {
        console.log("❌ Firestore connection failed:", firestoreError.message);
      }

      // Test Auth connection
      try {
        await auth.listUsers(1);
        console.log("✅ Firebase Auth connection test passed");
      } catch (authError) {
        console.log("⚠️  Auth connection issue:", authError.message);
      }
    } catch (error) {
      console.error("❌ Firebase connection test failed:", error.message);
    }
  }
};

// Run connection test after a short delay
setTimeout(testFirebaseConnection, 2000);

// Export collections
const usersCollection = db ? db.collection("users") : null;

module.exports = {
  admin,
  db,
  auth,
  storage,
  usersCollection,
  isFirebaseInitialized: () => firebaseInitialized,
  initializeFirestore,
};
