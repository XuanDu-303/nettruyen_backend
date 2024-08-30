const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Comment = require('../models/comment.model.js');
const Chapter = require('../models/chapter.model.js');
const User = require('../models/user.model.js');
const Comic = require('../models/comic.model.js');

const createComment = asyncHandler(async (req, res) => {
    const { chapterId } = req.params;
    const { content } = req.body;
    const userId = req.user._id
    try {
        const chapter = await Chapter.findOne({ externalId: chapterId });

        await Comic.findByIdAndUpdate(chapter.comic, {
            $inc: { totalComments : 1}
        })
        const newComment = new Comment({
            chapter: chapter._id,
            user: userId,
            content,
        });

        await User.findByIdAndUpdate(userId, {
            $push: { comments: newComment._id },
        });

        await newComment.save();

        res.status(201).json({
            success: true,});
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

const addReplyToComment = asyncHandler(async (req, res) => {
    const { chapterId } = req.params;
    const { content, parentId } = req.body;

    const userId = req.user._id;
    
    try {
        const chapter = await Chapter.findOne({ externalId: chapterId });
        const originalComment = await Comment.findById(parentId).populate('user');

        await Comic.findByIdAndUpdate(chapter.comic, {
            $inc: { totalComments: 1 }
        });
        
        const newComment = new Comment({
            chapter: chapter._id,
            user: userId,
            content,
            parentId: parentId,
        });

        const savedComment = await newComment.save();

        await User.findByIdAndUpdate(userId, {
            $push: { comments: newComment._id },
        });

        originalComment.replies.push(savedComment._id);
        await originalComment.save();

        // const notification = {
        //     type: 'reply',
        //     message: `Your comment has received a new reply.`,
        //     commentId: originalComment._id,
        // };
        
        // await User.findByIdAndUpdate(originalComment.user._id, {
        //     $push: { notifications: notification },
        // });

        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


const getCommentsWithReplies = async (commentId) => {
    const comment = await Comment.findById(commentId)
        .populate("replies likedBy dislikedBy")
        .populate({ path: "parentId", model: Comment, populate: { path: "user", model: User, select: "username" } })
        .populate({ path: "chapter", model: Chapter, select: "chapterNumber" })
        .populate({ path: "user", model: User, select: "username" });

    if (comment.replies.length > 0) {
        comment.replies = await Promise.all(
            comment.replies.map(async (reply) => await getCommentsWithReplies(reply._id))
        );
    }

    return comment
};

const getAllComments = asyncHandler(async (req, res) => {
    const { chapterId } = req.params;
    try {
        const chapter = await Chapter.findOne({ externalId: chapterId });
        const comments = await Comment.find({ chapter: chapter._id, parentId: null });
        let commentsWithReplies = await Promise.all(
            comments.map(async (comment) => await getCommentsWithReplies(comment._id))
        );

        res.status(200).json(commentsWithReplies);
    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

const fetchAllChildComments = asyncHandler(async (commentId) => {
    try {
        const childComments = await Comment.find({ parentId: commentId })
        const descendantComments = [];
        for (const childComment of childComments) {
            const descendants  = await fetchAllChildComments(childComment._id)
            descendantComments.push(childComment, ...descendants);
        }
        return descendantComments;
    } catch (error) {
        console.error('Error getting child comments:', error);
        res.status(500).json({ message: 'Server error' });
    }
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    try{
        const mainComment = await Comment.findById(commentId).populate({ path: "chapter", model: Chapter, populate: { path: "comic", model: Comic } });

        if (!mainComment.user.equals(userId)) {
            return res.status(404).json({ message: 'Comment not yours' });
        }

        const descendantComments = await fetchAllChildComments(commentId)

        const descendantCommentIds = [
            commentId,
            ...descendantComments.map((comment) => {
                comment._id
            })
        ]

        const uniqueUserId = new Set(
            [
                ...descendantComments.map((comment) => {
                    comment.user?._id?.toString()
                }),
                mainComment.user?._id?.toString()
            ].filter((id) => id !== undefined)
        )

        await Comment.deleteMany({ _id : { $in : descendantCommentIds} })

        await User.updateMany( { _id: { $in : Array.from(uniqueUserId)} }, {
            $pull: {
                comments: { $in : descendantCommentIds}
            }
        })

        const totalDeletedComments = descendantCommentIds.length;
        if (totalDeletedComments > 0 && mainComment.chapter && mainComment.chapter.comic) {
            await Comic.findByIdAndUpdate(
                mainComment.chapter.comic._id,
                { $inc: { totalComments: -totalDeletedComments } }
            );
        }

        res.status(200).json({ message: 'Comments deleted successfully' });

    } catch(err) {
        res.status(500).json({ message: 'Server error' });
    }
})

const toggleLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    try {
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const likedIndex = comment.likedBy.indexOf(userId);
        const dislikedIndex = comment.dislikedBy.indexOf(userId);

        if (likedIndex === -1) {
            comment.likedBy.push(userId);
            comment.likes += 1;

            if (dislikedIndex !== -1) {
                comment.dislikedBy.pull(userId);
                comment.dislikes -= 1;
            }

            // const notification = {
            //     type: 'like',
            //     message: `Your comment has been liked.`,
            //     commentId: comment._id,
            // };

            // await User.findByIdAndUpdate(comment.user._id, {
            //     $push: { notifications: notification },
            // });
        } else {
            comment.likedBy.pull(userId);
            comment.likes -= 1;
        }

        await comment.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


const toggleDislike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    try {
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const likedIndex = comment.likedBy.indexOf(userId);
        const dislikedIndex = comment.dislikedBy.indexOf(userId);

        if (dislikedIndex === -1) {
            comment.dislikedBy.push(userId);
            comment.dislikes += 1;

            if (likedIndex !== -1) {
                comment.likedBy.pull(userId);
                comment.likes -= 1;
            }

            // const notification = {
            //     type: 'dislike',
            //     message: `Your comment has been disliked.`,
            //     commentId: comment._id,
            // };
            // await User.findByIdAndUpdate(comment.user._id, {
            //     $push: { notifications: notification },
            // });
        } else {
            comment.dislikedBy.pull(userId);
            comment.dislikes -= 1;
        }

        await comment.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = { createComment, getAllComments, addReplyToComment, toggleLike, toggleDislike, deleteComment };
