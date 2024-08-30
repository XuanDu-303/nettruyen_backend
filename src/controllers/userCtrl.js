const mongoose = require('mongoose');
const User = require("../models/user.model");
const Comic = require("../models/comic.model");
const Wishlist = require("../models/wishlist.model");
const asyncHandler = require("express-async-handler");

const getWishlistsUser = asyncHandler(async (req, res) => {
  const {
    page = 1,
    items = 10,
  } = req.query;

  try {
    const userId = req.user._id;

    const total = await Wishlist.countDocuments({ user: userId });

    const wishlists = await Wishlist.find({ user: userId })
    .populate('comic')
    .skip((page - 1) * items)
    .limit(parseInt(items)).exec();
    
    const comics = wishlists.map(wishlist => wishlist.comic);

    res.status(200).json({
      success: true,
      result: comics,
      pagination: {
        totalPages: Math.ceil(total / items),
        currentPage: parseInt(page),
        totalItems: total,
      }
    });
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const addToHistory = async (userId, comicId) => {
  console.log(userId, comicId);
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }
    
    user.history = user.history.filter(id => id.toString() !== comicId.toString());
    
    user.history.unshift(comicId);

    if (user.history.length > 40) {
      user.history = user.history.slice(0, 40);
    }
    
    await user.save();

  } catch (error) {
    console.error("Error adding comic to history:", error);
  }
};

const getHistory = asyncHandler(async (req, res) => {
  const {
    page = 1,
    items = 10,
  } = req.query;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const totalItems = await Comic.countDocuments({ _id: { $in: user.history } });

    const historyIds = user.history;
    const history = await Comic.find({ _id: { $in: historyIds } })
      .sort({ lastViewUpdate: -1 })
      .skip((page - 1) * items)
      .limit(parseInt(items))
      .exec();

    res.status(200).json({
      success: true,
      result: history,
      pagination: {
        totalPages: Math.ceil(totalItems / items),
        currentPage: parseInt(page),
        totalItems: totalItems,
      }
    });

  } catch (error) {
    console.error("Error fetching user history:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = { getWishlistsUser, addToHistory, getHistory };
