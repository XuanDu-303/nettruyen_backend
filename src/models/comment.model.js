const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },

    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    parentId: { type: String },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
