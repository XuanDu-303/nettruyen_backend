const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
    comic: { type: mongoose.Schema.Types.ObjectId, ref: 'Comic', required: true },
    chapterNumber: { type: Number, required: true },// thay thế externalId
    externalId: { type: String },
    views: { type: Number, default: 0 },
    // lastViewUpdate: { type: Date, default: Date.now },
    // createdAt: { type: Date, default: Date.now },
});

const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;
