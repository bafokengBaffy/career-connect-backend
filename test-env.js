require('dotenv').config();
console.log('Testing environment variables:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || '❌ NOT FOUND');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ FOUND' : '❌ NOT FOUND');
console.log('FIREBASE_PRIVATE_KEY exists:', process.env.FIREBASE_PRIVATE_KEY ? '✅ YES' : '❌ NO');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ FOUND' : '❌ NOT FOUND');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || '❌ NOT FOUND');
