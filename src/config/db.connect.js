const mongoose = require("mongoose");

const dbConnect = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log("Database Connected Successfully");
  } catch (err) {
    console.error("Database Connection Error:", err);
  }
};

module.exports = dbConnect;
