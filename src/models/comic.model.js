const mongoose = require("mongoose");

const comicSchema = new mongoose.Schema({
  slug: { type: String, required: true },

  views: { type: Number, default: 0 },
  viewsToday: { type: Number, default: 0 },
  viewsThisWeek: { type: Number, default: 0 },
  viewsThisMonth: { type: Number, default: 0 },
  
  totalComments: { type: Number, default: 0 },
  followers: { type: Number, default: 0 },//followCount
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', default: [] }],

  externalId: { type: String },

  lastViewUpdate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

const Comic = mongoose.model("Comic", comicSchema);

module.exports = Comic;
