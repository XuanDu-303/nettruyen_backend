const router = require('express').Router();

const authRoute = require("./authRoute");
const comicRoutes = require("./comicRoute");
const userRoutes = require("./userRoute");

// auth routes
router.use("/auth", authRoute);

// user routes
router.use("/comic", comicRoutes);

router.use("/user", userRoutes);

module.exports = router;