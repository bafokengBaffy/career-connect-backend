const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary - You'll need to set these in your environment
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const cloudinaryController = {
  // Upload image to Cloudinary
  uploadImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'careerconnect/company',
        resource_type: 'auto',
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto:good' }
        ]
      });

      res.status(200).json({
        success: true,
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height
        }
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Image upload failed',
        details: error.message 
      });
    }
  },

  // Upload multiple images
  uploadMultipleImages: async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploadPromises = req.files.map(file => 
        cloudinary.uploader.upload(file.path, {
          folder: 'careerconnect/company',
          resource_type: 'auto'
        })
      );

      const results = await Promise.all(uploadPromises);

      res.status(200).json({
        success: true,
        data: results.map(result => ({
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format
        }))
      });
    } catch (error) {
      console.error('Cloudinary multiple upload error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Multiple image upload failed' 
      });
    }
  },

  // Delete image from Cloudinary
  deleteImage: async (req, res) => {
    try {
      const { public_id } = req.body;
      
      if (!public_id) {
        return res.status(400).json({ error: 'Public ID is required' });
      }

      const result = await cloudinary.uploader.destroy(public_id);

      res.status(200).json({
        success: result.result === 'ok',
        data: result
      });
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Image deletion failed' 
      });
    }
  },

  // Generate image URL with transformations
  generateImageUrl: (publicId, options = {}) => {
    const defaultOptions = {
      width: options.width || 800,
      height: options.height || 600,
      crop: options.crop || 'fill',
      gravity: options.gravity || 'auto',
      quality: options.quality || 'auto:good',
      format: options.format || 'auto'
    };

    return cloudinary.url(publicId, defaultOptions);
  },

  // Upload resume/PDF
  uploadDocument: async (fileBuffer, filename) => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'careerconnect/resumes',
          format: 'pdf',
          public_id: filename.replace(/\.[^/.]+$/, '')
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Convert buffer to stream
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }
};

module.exports = cloudinaryController;