// @ts-nocheck
const admin = require("firebase-admin");
const crypto = require('crypto');

/**
 * @type {admin.firestore.Firestore | null}
 */
let db = null;
let auth = null;
let storage = null;
let firebaseInitialized = false;

// SECURITY: Validate Firebase configuration
const validateFirebaseConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  
  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing required Firebase configuration');
    return false;
  }
  
  // SECURITY: Validate private key format
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.error('❌ Invalid private key format');
    return false;
  }
  
  return true;
};

const initializeFirebase = () => {
  // SECURITY: Validate config first
  if (!validateFirebaseConfig()) {
    console.log("⚠️ Firebase configuration invalid, skipping initialization");
    return false;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID;
  
  // Get and properly format the private key from .env
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  if (projectId && privateKey && clientEmail) {
    try {
      // =============================================
      // CRITICAL FIX: Properly handle .env private key
      // =============================================
      
      // 1. Remove surrounding quotes if present
      privateKey = privateKey.replace(/^"|"$/g, '');
      
      // 2. Replace literal \n with actual newline characters
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // 3. Ensure the key has proper line breaks
      if (!privateKey.includes('\n')) {
        const beginMarker = '-----BEGIN PRIVATE KEY-----';
        const endMarker = '-----END PRIVATE KEY-----';
        
        if (privateKey.includes(beginMarker) && privateKey.includes(endMarker)) {
          const start = privateKey.indexOf(beginMarker) + beginMarker.length;
          const end = privateKey.indexOf(endMarker);
          const base64Content = privateKey.substring(start, end);
          privateKey = `${beginMarker}\n${base64Content}\n${endMarker}\n`;
        }
      }

      // SECURITY: Validate private key format
      if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        throw new Error('Invalid private key format after processing');
      }

      console.log('🔑 Private key processed successfully');

      // Build the complete service account object
      const serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key_id: privateKeyId,
        private_key: privateKey,
        client_email: clientEmail,
        client_id: "110074025411918436620",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
        universe_domain: "googleapis.com"
      };

      // Check if already initialized
      if (admin.apps.length === 0) {
        const firebaseConfig = {
          credential: admin.credential.cert(serviceAccount),
          databaseURL: `https://${projectId}.firebaseio.com`,
          storageBucket: `${projectId}.appspot.com`,
          httpAgentOptions: {
            timeout: 30000, // 30 second timeout
          }
        };

        console.log('🚀 Initializing Firebase...');
        admin.initializeApp(firebaseConfig);
        
        // Set global fetch if needed
        if (typeof global.fetch === 'undefined') {
          global.fetch = require('node-fetch');
        }
      }

      db = admin.firestore();
      auth = admin.auth();
      storage = admin.storage();

      // SECURITY: Set Firestore settings
      db.settings({
        ignoreUndefinedProperties: true,
        timestampsInSnapshots: true
      });

      console.log("✅ Firebase Admin initialized successfully");
      console.log(`📁 Project: ${projectId}`);
      console.log(`👤 Service Account: ${clientEmail}`);

      firebaseInitialized = true;
      
      // SECURITY: Run security check after initialization
      setTimeout(() => checkFirebaseSecurity(), 2000);
      
      return true;
    } catch (error) {
      console.error("❌ Firebase Admin initialization error:", error.message);
      return false;
    }
  } else {
    console.log("⚠️ Firebase credentials not fully configured.");
    return false;
  }
};

// SECURITY: Check Firebase security configuration
const checkFirebaseSecurity = async () => {
  if (!firebaseInitialized || !db) return;
  
  try {
    console.log("\n🔐 Running Firebase security check...");
    
    // Try to access a protected path (should fail if rules are correct)
    const testDoc = db.collection('system').doc('_security_test');
    await testDoc.get();
    
    // If we get here, it means we can read system collection (BAD!)
    console.log('⚠️ SECURITY WARNING: System collection is readable!');
    console.log('   Your Firestore rules are too permissive.');
    console.log('   Please update your firestore.rules file immediately.');
  } catch (error) {
    // If we get permission denied, that's GOOD
    if (error.code === 7 || error.code === 'permission-denied') {
      console.log('✅ Firestore security rules are working correctly');
      console.log('   System collection access denied as expected');
    } else {
      console.log('⚠️ Security check inconclusive:', error.message);
    }
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

    // SECURITY: Check if we have admin access before initializing
    try {
      // Try to access a system document - if it fails, we can't initialize
      const systemConfigRef = db.collection("system").doc("configuration");
      await systemConfigRef.get();
    } catch (accessError) {
      if (accessError.code === 7 || accessError.code === 'permission-denied') {
        console.log("⚠️ Cannot initialize Firestore - insufficient permissions");
        console.log("   Make sure your service account has admin access");
        return false;
      }
    }

    const systemConfigRef = db.collection("system").doc("configuration");
    const systemConfig = await systemConfigRef.get();
    
    if (systemConfig.exists) {
      console.log("✅ Firestore already initialized, skipping setup");
      return true;
    }

    // Create initial collections with sample data
    const batch = db.batch();

    // System configuration collection
    batch.set(systemConfigRef, {
      appName: "Career Connect Lesotho",
      version: "1.0.0",
      initialized: true,
      initializedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
        description: "Creative innovation university focusing on technology and design",
        contact: {
          email: "info@limkokwing.ls",
          phone: "+266 2231 2356",
          address: "Maseru, Lesotho",
        },
        isVerified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
        location: "Maseru",
        description: "Leading financial services provider in Lesotho",
        contact: {
          email: "careers@standardbank.co.ls",
          phone: "+266 2231 2000",
          address: "Kingsway, Maseru",
        },
        isVerified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }
    ];

    companies.forEach((company) => {
      const companyRef = db.collection("companies").doc(company.id);
      batch.set(companyRef, company);
    });

    // Commit the batch
    await batch.commit();
    console.log("✅ Firestore database structure initialized successfully");
    console.log("📊 Created: system, institutions, courses, companies collections");

    return true;
  } catch (error) {
    console.error("❌ Firestore initialization error:", error.message);
    return false;
  }
};

// Test Firebase connection
const testFirebaseConnection = async () => {
  if (firebaseInitialized) {
    try {
      console.log("\n🔄 Testing Firebase connections...");

      // Test Auth connection
      try {
        const authTest = await auth.listUsers(1);
        console.log("✅ Firebase Auth connection: OK");
      } catch (authError) {
        console.log("⚠️ Auth connection issue:", authError.message);
      }

      // Test Firestore connection with a safe test
      try {
        // Use a collection that should be accessible to admins
        const testRef = db.collection("system").doc("_health_check");
        await testRef.set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          test: true
        }, { merge: true });
        
        console.log("✅ Firestore write: OK");
        
        // Clean up
        await testRef.delete();
        console.log("✅ Firestore delete: OK");
      } catch (firestoreError) {
        if (firestoreError.code === 7 || firestoreError.code === 'permission-denied') {
          console.log("⚠️ Firestore: Permission denied - security rules are working");
        } else {
          console.log("❌ Firestore error:", firestoreError.message);
        }
      }

    } catch (error) {
      console.error("❌ Connection test failed:", error.message);
    }
  }
};

// Initialize with retry
const initializeWithRetry = async (retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    if (firebaseInitialized) {
      await testFirebaseConnection();
      return;
    }
    
    console.log(`🔄 Waiting for Firebase initialization (attempt ${i + 1}/${retries})...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  if (!firebaseInitialized) {
    console.log("⚠️ Firebase failed to initialize after retries");
  }
};

// Run initialization with retry
setTimeout(() => initializeWithRetry(), 1000);

// Export collections with null checks
const usersCollection = db ? db.collection("users") : null;
const companiesCollection = db ? db.collection("companies") : null;
const institutionsCollection = db ? db.collection("institutions") : null;
const coursesCollection = db ? db.collection("courses") : null;

module.exports = {
  admin,
  db,
  auth,
  storage,
  usersCollection,
  companiesCollection,
  institutionsCollection,
  coursesCollection,
  isFirebaseInitialized: () => firebaseInitialized,
  initializeFirestore,
  testFirebaseConnection,
  checkFirebaseSecurity
};