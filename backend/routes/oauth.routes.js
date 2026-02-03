const express = require('express');
const router = express.Router();
const { googleSignIn, appleSignIn } = require('../controllers/oauth.controller');

// OAuth routes
router.post('/google', googleSignIn);
router.post('/apple', appleSignIn);

module.exports = router;
