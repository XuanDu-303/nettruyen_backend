const express = require("express");
const router = express.Router();

const { createComment, getAllComments, addReplyToComment, toggleLike, toggleDislike, deleteComment } = require('../../controllers/commentCtrl.js');
const { authMiddleware } = require("../../middlewares/authMiddleware")


router.post('/:chapterId', authMiddleware, createComment);

router.post('/reply/:chapterId', authMiddleware, addReplyToComment);

router.put('/like/:commentId', authMiddleware, toggleLike);

router.put('/dislike/:commentId', authMiddleware, toggleDislike);

router.get('/:chapterId', getAllComments);

router.delete('/:commentId', authMiddleware, deleteComment);


module.exports = router;