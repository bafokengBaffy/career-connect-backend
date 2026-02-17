// controllers/uploadController.js - UPDATED WITH CLOUDINARY UPLOAD
const stream = require('stream');
const { cloudinary } = require('../config/cloudinary');

// Upload single file
exports.uploadFile = async (req, res) => {
  try {
    console.log('📤 Uploading single file...');
    
    if (!req.file) {
      console.log('❌ No file provided');
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    console.log(`📄 File details: ${req.file.originalname}, ${req.file.mimetype}, ${req.file.size} bytes`);

    // Upload buffer to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'career-connect-lesotho',
        resource_type: 'auto',
        public_id: req.file.originalname.split('.')[0],
        overwrite: false
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload to Cloudinary',
            error: error.message
          });
        }

        console.log('✅ File uploaded to Cloudinary:', result.secure_url);
        
        res.status(200).json({
          success: true,
          message: 'File uploaded successfully',
          data: {
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height,
            resource_type: result.resource_type
          }
        });
      }
    );

    // Create readable stream from buffer and pipe to Cloudinary
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);
    bufferStream.pipe(uploadStream);

  } catch (error) {
    console.error('❌ Upload controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during upload',
      error: error.message
    });
  }
};

// Upload multiple files
exports.uploadMultipleFiles = async (req, res) => {
  try {
    console.log('📤 Uploading multiple files...');
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    console.log(`📄 Processing ${req.files.length} files`);

    // Upload each file to Cloudinary
    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'career-connect-lesotho',
            resource_type: 'auto',
            public_id: file.originalname.split('.')[0],
            overwrite: false
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                size: result.bytes,
                original_name: file.originalname,
                mimetype: file.mimetype
              });
            }
          }
        );

        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream.pipe(uploadStream);
      });
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    
    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files`);

    res.status(200).json({
      success: true,
      message: 'Files uploaded successfully',
      count: uploadedFiles.length,
      data: uploadedFiles
    });

  } catch (error) {
    console.error('❌ Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: error.message
    });
  }
};

// Delete file
exports.deleteFile = async (req, res) => {
  try {
    const { public_id, resource_type = 'image' } = req.body;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    console.log(`🗑️ Deleting file: ${public_id}`);

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: resource_type
    });

    console.log('✅ Delete result:', result);

    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete file',
        result: result
      });
    }
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
};

// Upload from URL
exports.uploadFromUrl = async (req, res) => {
  try {
    const { url, folder = 'career-connect-lesotho' } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    console.log(`🌐 Uploading from URL: ${url}`);

    const result = await cloudinary.uploader.upload(url, {
      folder: folder
    });

    res.status(200).json({
      success: true,
      message: 'File uploaded from URL successfully',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        size: result.bytes
      }
    });
  } catch (error) {
    console.error('❌ URL upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file from URL',
      error: error.message
    });
  }
};

// Optimize image (placeholder - implement as needed)
exports.optimizeImage = async (req, res) => {
  try {
    const { public_id, transformations = {} } = req.body;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    // Generate optimized URL
    const optimizedUrl = cloudinary.url(public_id, {
      ...transformations,
      quality: 'auto',
      fetch_format: 'auto'
    });

    res.status(200).json({
      success: true,
      message: 'Image optimization URL generated',
      data: {
        optimized_url: optimizedUrl,
        public_id: public_id
      }
    });
  } catch (error) {
    console.error('❌ Optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing image',
      error: error.message
    });
  }
};