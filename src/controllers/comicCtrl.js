const asyncHandler = require("express-async-handler");
const Comic = require("../models/comic.model");
const Wishlist = require("../models/wishlist.model");
const User = require("../models/user.model");
const Chapter = require("../models/chapter.model");
const { addToHistory } = require("./userCtrl");
const jwt = require("jsonwebtoken");

// const bulkUpdate = asyncHandler(async (req, res) => {
//   try {
//     const { comics } = req.body;

//     const chapterBulkOps = [];

//     // Process comics first
//     for (let comicData of comics) {
//       await Comic.findOneAndUpdate(
//         { externalId: comicData.externalId },
//         { $set: { slug: comicData.slug } },
//         { new: true, upsert: true }
//       );

//       for (let chapterData of comicData.chapters) {
//         chapterBulkOps.push({
//           updateOne: {
//             filter: { externalId: chapterData.externalId },
//             update: {
//               $set: {
//                 comic: comicData._id,
//                 chapterNumber: chapterData.chapterNumber,
//               }
//             },
//             upsert: true
//           }
//         });
//       }
//     }

//     if (chapterBulkOps.length > 0) {
//       await Chapter.bulkWrite(chapterBulkOps);
//     }

//     res.status(200).json({ message: 'Comics and chapters updated successfully.' });
//   } catch (error) {
//     console.error('Error updating comics and chapters:', error);
//     res.status(500).json({ message: 'Error updating comics and chapters.', error });
//   }
// });

const bulkUpdateComics = asyncHandler(async (req, res) => {
  try {
    const { comics } = req.body;

    if (!comics || comics.length === 0) {
      return res.status(400).json({ message: "No comics data provided." });
    }

    const bulkOps = comics.map((comic) => {
      const filter = comic.externalId
        ? { externalId: comic.externalId }
        : { slug: comic.slug };

      return {
        updateOne: {
          filter,
          update: {
            $set: { slug: comic.slug },
            $setOnInsert: {
              views: 0,
              followers: 0,
              chapters: [],
              lastViewUpdate: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    const bulkWriteResult = await Comic.bulkWrite(bulkOps);

    res.status(200).json({
      message: `${bulkWriteResult.upsertedCount} comics created or updated successfully.`,
    });
  } catch (error) {
    console.error("Error in bulk update:", error);
    res.status(500).json({ message: "Error in bulk update", error });
  }
});


const bulkUpdateChapters = asyncHandler(async (req, res) => {
  try {
    const { chapters, comicId, slug } = req.body;

    if (!comicId) {
      return res.status(400).json({ message: "Comic ID is required" });
    }

    const comic = await Comic.findOneAndUpdate(
      { externalId: comicId },
      {
        $set: { slug: slug },
      },
      { new: true, upsert: true }
    );

    if (!comic) {
      return res.status(404).json({ message: "Comic not found" });
    }

    const chapterBulkOps = [];

    for (let chapterData of chapters) {
      chapterBulkOps.push({
        updateOne: {
          filter: { externalId: chapterData.externalId },
          update: {
            $set: {
              comic: comic._id,
              chapterNumber: chapterData.chapterNumber,
            },
          },
          upsert: true,
        },
      });
    }

    if (chapterBulkOps.length > 0) {
      await Chapter.bulkWrite(chapterBulkOps);
    }

    const updatedChapters = await Chapter.find({
      externalId: { $in: chapters.map((chapter) => chapter.externalId) },
    }).select("_id");

    comic.chapters = [
      ...new Set([
        ...comic.chapters,
        ...updatedChapters.map((chapter) => chapter._id),
      ]),
    ];

    await comic.save();

    res
      .status(200)
      .json({ message: "Comics and chapters updated successfully." });
  } catch (error) {
    console.error("Error updating comics and chapters:", error);
    res
      .status(500)
      .json({ message: "Error updating comics and chapters.", error });
  }
});

const getMetricsBySlug = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;

    const comic = await Comic.findOne({ slug: slug })
      .populate("chapters")
      .select("views followers totalComments");

    if (!comic) {
      return res.status(404).json({ message: "Comic not found" });
    }

    const token = req.headers?.authorization?.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded._id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      const isFollowed = await Wishlist.exists({
        user: req.user._id,
        comic: comic._id,
      });

      return res.status(200).json({
        ...comic.toObject(),
        isFollowed: !!isFollowed,
      });
    }

    return res.status(200).json({
      ...comic.toObject(),
    });
  } catch (error) {
    console.error("Error fetching comic details:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

const toggleFollowComic = asyncHandler(async (req, res) => {
  try {
    const { comicId } = req.body;
    const userId = req.user._id;

    const existingFollow = await Wishlist.findOne({
      user: userId,
      comic: comicId,
    });

    if (existingFollow) {
      await Wishlist.findByIdAndDelete(existingFollow._id);

      await Comic.findByIdAndUpdate(comicId, { $inc: { followers: -1 } });

      return res.status(200).json({ message: "Unfollowed successfully." });
    } else {
      const newFollow = new Wishlist({
        user: userId,
        comic: comicId,
      });

      await newFollow.save();

      await Comic.findByIdAndUpdate(comicId, { $inc: { followers: 1 } });

      return res
        .status(201)
        .json({ message: "Followed successfully.", follow: newFollow });
    }
  } catch (error) {
    console.error("Error toggling follow/unfollow:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

const incViewsComic = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const now = new Date();

  try {
    const comic = await Comic.findOne({ slug });

    const token = req.headers?.authorization?.split(" ")[1] ;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded._id).select("-password");
      await addToHistory(req.user.id, comic._id);
    }

    if (!comic) {
      return res.status(404).json({ message: "Comic not found" });
    }

    if (comic.lastViewUpdate.getDate() !== now.getDate()) {
      comic.viewsToday = 0;
    }

    if (now - comic.lastViewUpdate > 7 * 24 * 60 * 60 * 1000) {
      comic.viewsThisWeek = 0;
    }

    if (comic.lastViewUpdate.getMonth() !== now.getMonth()) {
      comic.viewsThisMonth = 0;
    }

    comic.views += 1;
    comic.viewsToday += 1;
    comic.viewsThisWeek += 1;
    comic.viewsThisMonth += 1;
    comic.lastViewUpdate = now;

    await comic.save();

    res.json({ views: comic.views });
  } catch (error) {
    console.error("Error increasing views:", error);
    res.status(500).json({ message: "Server error" });
  }
});

const incViewsChapter = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const chapter = await Chapter.findOneAndUpdate(
      { externalId: id },
      { $inc: { views: 1 } },
      { new: true }
    ).populate("comic");

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // const auth = req.headers.authorization;
    // const token = auth.split(" ")[1];
    // await incViewsComic(
    //   { params: { slug: chapter.comic.slug, token1: token } },
    //   res
    // );
    res.json({ views: chapter.views });
  } catch (error) {
    console.error("Error increasing views:", error);
    res.status(500).json({ message: "Server error" });
  }
});

const getTopComics = asyncHandler(async (req, res) => {
  const { period } = req.query;

  try {
    let comics;

    switch (period) {
      case "day":
        comics = await Comic.find()
          .sort({ viewsToday: -1 })
          .limit(7)
          .select("viewsToday views slug externalId");
        break;
      case "week":
        comics = await Comic.find()
          .sort({ viewsThisWeek: -1 })
          .limit(7)
          .select("viewsThisWeek views slug externalId");
        break;
      case "month":
        comics = await Comic.find()
          .sort({ viewsThisMonth: -1 })
          .limit(7)
          .select("viewsThisMonth views slug externalId");
        break;
      default:
        return res
          .status(400)
          .json({ message: 'Invalid period. Use "day", "week", or "month".' });
    }

    console.log(comics)
    res.json(comics);
  } catch (error) {
    console.error(`Error getting top comics of the ${period}:`, error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = {
  bulkUpdateChapters,
  getMetricsBySlug,
  toggleFollowComic,
  incViewsComic,
  getTopComics,
  incViewsChapter,
  bulkUpdateComics,
};
