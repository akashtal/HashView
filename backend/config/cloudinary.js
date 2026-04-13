const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Folder paths use businessId (not business name) to guarantee
// uniqueness and prevent cross-business image collision.
// A name-based path (e.g. "hashview/business/the-abode/logo") would be shared
// by any two businesses with the same name. The MongoDB _id is permanent
// and globally unique, making it the only correct choice for folder segregation.
// ─────────────────────────────────────────────────────────────────────────────

// Profile Image Storage
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hashview/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 500, height: 500, crop: 'fill', gravity: 'face' },
      { quality: 'auto' }
    ]
  }
});

// Business Logo Storage — businessId-based folder path
const businessLogoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const businessId = req.query.businessId || req.body.businessId;

    // ✅ Always use businessId — never business name
    const folderPath = businessId
      ? `hashview/business/${businessId}/logo`
      : 'hashview/business/unassigned/logo';

    return {
      folder: folderPath,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      transformation: [
        { width: 400, height: 400, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      overwrite: false,
      resource_type: 'image'
    };
  }
});

// Business Cover Image Storage — businessId-based folder path
const businessCoverStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const businessId = req.query.businessId || req.body.businessId;

    const folderPath = businessId
      ? `hashview/business/${businessId}/cover`
      : 'hashview/business/unassigned/cover';

    return {
      folder: folderPath,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 1200, height: 600, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      overwrite: false,
      resource_type: 'image'
    };
  }
});

// Business Documents Storage (KYC) — businessId-based folder path
const businessDocumentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const businessId = req.query.businessId || req.body.businessId;

    const folderPath = businessId
      ? `hashview/business/${businessId}/documents`
      : 'hashview/business/unassigned/documents';

    return {
      folder: folderPath,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      resource_type: 'auto',
      overwrite: false
    };
  }
});

// Business Gallery Storage — businessId-based folder path
const businessGalleryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const businessId = req.query.businessId || req.body.businessId;

    const folderPath = businessId
      ? `hashview/business/${businessId}/gallery`
      : 'hashview/business/unassigned/gallery';

    return {
      folder: folderPath,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 1024, height: 768, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      overwrite: false,
      resource_type: 'image'
    };
  }
});

// Create multer instances
const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadBusinessLogo = multer({
  storage: businessLogoStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadBusinessCover = multer({
  storage: businessCoverStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadBusinessDocuments = multer({
  storage: businessDocumentStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per document
});

const uploadBusinessGallery = multer({
  storage: businessGalleryStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per image
});

// Review Media Storage (Photos)
const reviewPhotoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hashview/reviews/photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1024, height: 1024, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' }
    ],
    overwrite: false,
    resource_type: 'image'
  }
});

// Review Media Storage (Videos)
const reviewVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hashview/reviews/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
    overwrite: false
  }
});

const uploadReviewPhotos = multer({
  storage: reviewPhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per photo
});

const uploadReviewVideos = multer({
  storage: reviewVideoStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB per video
});

module.exports = {
  cloudinary,
  uploadProfile,
  uploadBusinessLogo,
  uploadBusinessCover,
  uploadBusinessDocuments,
  uploadBusinessGallery,
  uploadReviewPhotos,
  uploadReviewVideos
};
