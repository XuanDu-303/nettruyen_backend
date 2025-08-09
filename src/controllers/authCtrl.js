const User = require("../models/user.model");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

exports.registerUser = asyncHandler(async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;
    console.log(req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Địa chỉ email đã tồn tại" });
    }

    await User.create({
      username,
      email,
      password: password,
      avatar,
    });

    res.json({ message: "Đăng ký thành công" });
  } catch (error) {
    throw new Error(error);
  }
});

exports.loginUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({
        message: `Địa chỉ email chưa được đăng kí`,
      });
    }

    if (!(await user.isPasswordMatched(password))) {
      res.status(400).json({
        message: `Mật khẩu không chính xác`,
      });
    }
    const token = jwt.sign({ _id: user?._id }, process.env.JWT_SECRET, {
      expiresIn: "3d",
    });

    return res
      .cookie("token", token, {
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000,
        domain: req.hostname,
        sameSite: "none",
        secure: process.env.NODE_ENV === "production",
        path: "/api",
      })
      .json({
        success: true,
        token: token,
        result: {
          _id: user?._id,
          username: user?.username,
          email: user?.email,
          avatar: user?.avatar,
        },
        message: "Successfully login user",
      });
  } catch (error) {
    throw new Error(error);
  }
});

exports.logoutUser = asyncHandler(async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.json({
        success: true,
        message: "token not found",
      });
    }
    let decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded) {
      res
        .clearCookie("token", {
          sameSite: "Lax",
          httpOnly: true,
          secure: true,
          domain: req.hostname,
          path: "/api",
        })
        .json({
          success: true,
          result: {},
          message: "Successfully logged out",
        });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});
