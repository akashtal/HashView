const admin = require('../config/firebase.config');
const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');
const jwt = require('jsonwebtoken');

// @desc    Google Sign-In
// @route   POST /api/auth/oauth/google
// @access  Public
exports.googleSignIn = async (req, res, next) => {
    try {
        const { idToken, role } = req.body; // role: 'customer' or 'business'

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'ID token is required'
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

        // Determine which model to use
        const Model = role === 'business' ? BusinessOwner : User;
        const modelName = role === 'business' ? 'business owner' : 'user';

        // Check if user exists
        let user = await Model.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Create new user
            user = await Model.create({
                name: name || 'User',
                email: email.toLowerCase(),
                emailVerified: true, // Firebase already verified
                avatar: picture || '',
                authProvider: 'google',
                firebaseUid: uid,
                passwordHash: Math.random().toString(36) // Random password (OAuth users won't use it)
            });

            console.log(`✅ Created new ${modelName} via Google Sign-In: ${email}`);
        } else if (!user.firebaseUid) {
            // Link existing account to Firebase
            user.firebaseUid = uid;
            user.authProvider = 'google';
            user.emailVerified = true;
            if (picture && !user.avatar) user.avatar = picture;
            await user.save();
            console.log(`✅ Linked existing ${modelName} to Google: ${email}`);
        }

        // Generate JWT token for your app
        const token = jwt.sign(
            { id: user._id, role: role === 'business' ? 'owner' : 'customer' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            message: 'Google Sign-In successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: role === 'business' ? 'owner' : 'customer'
            }
        });
    } catch (error) {
        console.error('Google Sign-In error:', error);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please sign in again'
            });
        }

        if (error.code === 'auth/argument-error') {
            return res.status(400).json({
                success: false,
                message: 'Invalid token format'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Google Sign-In failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Facebook Sign-In
// @route   POST /api/auth/oauth/facebook
// @access  Public
exports.facebookSignIn = async (req, res, next) => {
    try {
        const { idToken, role } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'ID token is required'
            });
        }

        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, picture, uid } = decodedToken;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email not found. Please ensure your Facebook account has an email.'
            });
        }

        // Same logic as Google Sign-In
        const Model = role === 'business' ? BusinessOwner : User;
        const modelName = role === 'business' ? 'business owner' : 'user';

        let user = await Model.findOne({ email: email.toLowerCase() });

        if (!user) {
            user = await Model.create({
                name: name || 'User',
                email: email.toLowerCase(),
                emailVerified: true,
                avatar: picture || '',
                authProvider: 'facebook',
                firebaseUid: uid,
                passwordHash: Math.random().toString(36)
            });

            console.log(`✅ Created new ${modelName} via Facebook Sign-In: ${email}`);
        } else if (!user.firebaseUid) {
            user.firebaseUid = uid;
            user.authProvider = 'facebook';
            user.emailVerified = true;
            if (picture && !user.avatar) user.avatar = picture;
            await user.save();
            console.log(`✅ Linked existing ${modelName} to Facebook: ${email}`);
        }

        const token = jwt.sign(
            { id: user._id, role: role === 'business' ? 'owner' : 'customer' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            message: 'Facebook Sign-In successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: role === 'business' ? 'owner' : 'customer'
            }
        });
    } catch (error) {
        console.error('Facebook Sign-In error:', error);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please sign in again'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Facebook Sign-In failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
