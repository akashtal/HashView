const { generateBusinessQRCode } = require('../utils/qrcode');
const { cloudinary } = require('../config/cloudinary');
const Business = require('../models/Business.model');

/**
 * Generates a HashView branded QR code for a business.
 * Uploads to Cloudinary and saves URL to Business model.
 * 
 * @param {String} businessId 
 * @returns {String} Cloudinary secure URL of the generated QR code
 */
const generateBusinessQR = async (businessId) => {
  try {
    const business = await Business.findById(businessId);
    if (!business) {
      throw new Error(`Business not found for ID: ${businessId}`);
    }

    // Generate branded QR as data URL using existing utility
    const qrDataUrl = await generateBusinessQRCode(businessId, business.name);
    
    // Upload to Cloudinary
    const uploaded = await cloudinary.uploader.upload(qrDataUrl, {
      folder: 'hashview/qr-codes',
      public_id: `business_${businessId}`,
      overwrite: true
    });
    
    // Store URL in existing Business.qrCode field
    business.qrCode = uploaded.secure_url;
    await business.save();
    
    return uploaded.secure_url;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

module.exports = {
  generateBusinessQR
};
