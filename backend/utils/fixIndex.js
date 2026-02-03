require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');

// Connect to DB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        // 1. Drop User phone index
        try {
            await mongoose.connection.collection('users').dropIndex('phone_1');
            console.log('✅ Dropped users.phone_1 index');
        } catch (error) {
            console.log('ℹ️  users.phone_1 index not found or already dropped');
        }

        // 2. Drop BusinessOwner phone index (just in case)
        try {
            await mongoose.connection.collection('businessowners').dropIndex('phone_1');
            console.log('✅ Dropped businessowners.phone_1 index');
        } catch (error) {
            console.log('ℹ️  businessowners.phone_1 index not found or already dropped');
        }

        console.log('🎉 Index fix complete. You can restart the server now.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

connectDB();
