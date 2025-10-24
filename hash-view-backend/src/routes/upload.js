const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('application/pdf') ||
        file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and text files are allowed'), false);
    }
  }
});

// @route   POST /api/upload/image
// @desc    Upload image to Cloudinary
// @access  Private
router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'hashview/images',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading image'
    });
  }
});

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file provided'
      });
    }

    // Upload to Cloudinary with specific avatar transformations
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'hashview/avatars',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id
      }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading avatar'
    });
  }
});

// @route   POST /api/upload/business-gallery
// @desc    Upload business gallery image
// @access  Private (Business/Admin)
router.post('/business-gallery', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'hashview/business-gallery',
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.json({
      success: true,
      message: 'Business gallery image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      }
    });

  } catch (error) {
    console.error('Business gallery upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading business gallery image'
    });
  }
});

// @route   DELETE /api/upload/:publicId
// @desc    Delete uploaded file from Cloudinary
// @access  Private
router.delete('/:publicId', auth, async (req, res) => {
  try {
    const { publicId } = req.params;

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting file'
    });
  }
});

// @route   POST /api/upload/signed-url
// @desc    Get signed URL for direct upload
// @access  Private
router.post('/signed-url', auth, async (req, res) => {
  try {
    const { folder = 'hashview/uploads', resourceType = 'image' } = req.body;

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
        resource_type: resourceType
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      success: true,
      data: {
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder,
        resourceType
      }
    });

  } catch (error) {
    console.error('Generate signed URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating signed URL'
    });
  }
});

module.exports = router;
