// @ts-nocheck
require('dotenv').config({ debug: false });

// Helper function to check if a variable exists and show preview
function checkVar(name) {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        console.log(`❌ ${name}: NOT CONFIGURED`);
        return false;
    } else {
        // For private key, just show that it exists (don't show content)
        if (name === 'FIREBASE_PRIVATE_KEY') {
            const lines = value.split('\n').length;
            const hasBegin = value.includes('BEGIN PRIVATE KEY');
            const hasEnd = value.includes('END PRIVATE KEY');
            console.log(`✅ ${name}: Present (${lines} lines, BEGIN: ${hasBegin}, END: ${hasEnd})`);
        } else {
            // Show first 15 chars for other variables
            const preview = value.length > 15 ? value.substring(0, 15) + '...' : value;
            console.log(`✅ ${name}: ${preview}`);
        }
        return true;
    }
}

console.log('🔍 Checking environment variables...\n');

const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

let missingVars = [];
let foundVars = [];

requiredVars.forEach(varName => {
    if (!checkVar(varName)) {
        missingVars.push(varName);
    } else {
        foundVars.push(varName);
    }
});

console.log('\n' + '='.repeat(50));

if (missingVars.length > 0) {
    console.log(`\n⚠️  Missing ${missingVars.length} environment variables:\n`);
    missingVars.forEach(varName => {
        console.log(`   ❌ ${varName}`);
    });
    console.log('\nPlease check your .env file contains these variables.');
    process.exit(1);
} else {
    console.log(`\n✅ All ${foundVars.length} required environment variables are configured!\n`);
    console.log('📁 .env file loaded successfully');
    console.log(`   Location: ${process.cwd()}\\.env`);
    process.exit(0);
}