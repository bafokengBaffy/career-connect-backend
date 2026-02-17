// config/cloudinary.js - UPDATED
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

console.log('🔍 Configuring Cloudinary...');
console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ ' + process.env.CLOUDINARY_CLOUD_NAME : '❌ Not set');
console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Not set');
console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Not set');

// Check if all required environment variables are set
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️  WARNING: Cloudinary environment variables not fully configured');
  console.warn('⚠️  File uploads will use development mode');
  
  // Create a development mock
  const mockCloudinary = {
    uploader: {
      upload_stream: (/** @type {{ folder: any; }} */ options, /** @type {(arg0: null, arg1: { secure_url: string; public_id: string; format: string; bytes: any; width: number; height: number; }) => void} */ callback) => {
        console.log('📤 [DEV MODE] Mock Cloudinary upload for:', options.folder || 'default');
        const stream = {
          end: (/** @type {string | any[]} */ buffer) => {
            console.log(`📤 [DEV MODE] File buffer size: ${buffer.length} bytes`);
            // Simulate successful upload
            setTimeout(() => {
              callback(null, {
                secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${options.folder || 'career-connect'}/dev-file-${Date.now()}.jpg`,
                public_id: `dev-${Date.now()}`,
                format: 'jpg',
                bytes: buffer.length,
                width: 800,
                height: 600
              });
            }, 100);
          }
        };
        return stream;
      },
      destroy: async (/** @type {any} */ public_id) => {
        console.log(`🗑️ [DEV MODE] Deleting: ${public_id}`);
        return { result: 'ok' };
      },
      upload: async (/** @type {any} */ url, /** @type {any} */ options) => {
        console.log(`🌐 [DEV MODE] Uploading from URL: ${url}`);
        return {
          secure_url: url,
          public_id: `url-${Date.now()}`,
          format: 'jpg',
          bytes: 1024,
          width: 800,
          height: 600
        };
      }
    },
    url: (/** @type {any} */ public_id, /** @type {{ transformation: any; }} */ options) => {
      return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || 'demo'}/image/upload/${options?.transformation || ''}/${public_id}`;
    }
  };
  
  module.exports = mockCloudinary;
} else {
  // Configure real Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  
  console.log('✅ Cloudinary configured successfully');
  console.log(`📁 Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  
  // Test connection
  cloudinary.api.ping((error, result) => {
    if (error) {
      console.error('❌ Cloudinary connection test failed:', error.message);
    } else {
      console.log('✅ Cloudinary connection test passed');
    }
  });
  
  module.exports = cloudinary;
}