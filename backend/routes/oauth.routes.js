const express = require('express');
const router = express.Router();
const { googleSignIn, facebookSignIn } = require('../controllers/oauth.controller');

// OAuth routes
router.post('/google', googleSignIn);
router.post('/facebook', facebookSignIn);

module.exports = router;
