const express = require("express");
const router = express.Router();

const { getWishlistsUser, getHistory } = require('../../controllers/userCtrl.js');
const { authMiddleware } = require("../../middlewares/authMiddleware")

// router.get('/', getAllComic);
router.get('/wishlists', authMiddleware, getWishlistsUser);
router.get('/history', authMiddleware, getHistory);

module.exports = router;