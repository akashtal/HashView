const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');
const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');

// @desc    Google Sign-In
// @route   POST /api/auth/oauth/google
// @access  Public
exports.googleSignIn = async (req, res, next) => {
    try {
        const { idToken, role } = req.body;

        console.log('📥 Google OAuth Request:', {
            role,
            hasToken: !!idToken,
            tokenLength: idToken?.length
        });

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'ID token is required'
            });
        }

        // Validate role parameter
        if (!role || !['customer', 'business'].includes(role)) {
            console.error('❌ Invalid role provided:', role);
            return res.status(400).json({
                success: false,
                message: 'Valid role is required (customer or business)'
            });
        }

        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, picture, uid } = decodedToken;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email not found in token'
            });
        }

        console.log('🔍 Token verified:', { email, name, uid: uid.substring(0, 10) + '...' });

        // Determine which model to use based on requested role
        const requestedModel = role === 'business' ? BusinessOwner : User;
        const requestedModelName = role === 'business' ? 'BusinessOwner' : 'User';
        const otherModel = role === 'business' ? User : BusinessOwner;
        const otherModelName = role === 'business' ? 'User' : 'BusinessOwner';

        console.log(`🔎 Checking if email exists in ${requestedModelName} table: ${email}`);

        // Check if user exists in the REQUESTED table
        let user = await requestedModel.findOne({ email: email.toLowerCase() });

        if (user) {
            // User found in correct table - proceed with login
            console.log(`✅ Found existing account in ${requestedModelName}: ${email} (name: ${user.name})`);

            // Link Firebase if needed
            if (!user.firebaseUid) {
                user.firebaseUid = uid;
                user.authProvider = 'google';
            }
            user.emailVerified = true;
            if (picture && !user.avatar) user.avatar = picture;
            await user.save();
        } else {
            // User NOT found in requested table - check if exists in OTHER table
            console.log(`⚠️ Not found in ${requestedModelName}, checking ${otherModelName}...`);
            const userInOtherTable = await otherModel.findOne({ email: email.toLowerCase() });

            if (userInOtherTable) {
                // Account exists but in WRONG table
                const existingRole = role === 'business' ? 'customer' : 'business';
                console.log(`❌ Account found in ${otherModelName} table (${existingRole}), not ${requestedModelName}`);

                return res.status(400).json({
                    success: false,
                    message: `This email is registered as a ${existingRole}. Please login from the ${existingRole} section or create a new ${role} account with a different email.`
                });
            }

            // Email doesn't exist in either table - create new account
            console.log(`✅ Email not found in either table, creating new ${requestedModelName} account`);
            user = await requestedModel.create({
                name: name || 'User',
                email: email.toLowerCase(),
                emailVerified: true,
                avatar: picture || '',
                authProvider: 'google',
                firebaseUid: uid,
                passwordHash: Math.random().toString(36)
            });

            console.log(`✅ Created new ${requestedModelName} account: ${email} (name: ${user.name})`);
        }

        // Get the actual role from the database model
        const userRole = user.role;

        // For business owners, fetch their businesses from the Business collection
        let businesses = [];
        if (userRole === 'business') {
            const Business = require('../models/Business.model');
            businesses = await Business.find({ owner: user._id });
            console.log(`📊 Found ${businesses.length} businesses for owner ${user._id}`);
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: userRole },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        const response = {
            success: true,
            message: `Google Sign-In successful as ${userRole}`,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: userRole,
                businesses: businesses || []
            }
        };

        console.log(`✅ Sending response: role=${userRole}, userName=${user.name}, businesses=${businesses.length}`);
        res.status(200).json(response);
    } catch (error) {
        console.error('❌ Google Sign-In error:', error);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please sign in again.'
            });
        }

        if (error.code === 'auth/argument-error') {
            return res.status(400).json({
                success: false,
                message: 'Invalid token format'
            });
        }

        next(error);
    }
};

// PLACEHOLDER_FOR_FACEBOOK_OAUTH

module.exports = exports;
