require("dotenv").config();
const express = require("express");
const dbConnect = require("./config/db.connect");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const app = express();
const bodyParser = require("body-parser");
// const routes = require('./routes/api');
const comicRoute = require("./routes/api/comicRoute");
const userRoute = require("./routes/api/userRoute");
const authRoute = require("./routes/api/authRoute");
const commentRoute = require("./routes/api/commentRoute");
const router = require("express").Router();
const { notFound, errorHandler } = require("./middlewares/errorHandler");

// ====== ENV ======
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 8888;
const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5173"; // set trên Render khi prod

app.use(express.json({ limit: "2gb" }));
app.use(express.urlencoded({ limit: "2gb", extended: true }));
if (NODE_ENV !== "test") app.use(morgan("dev"));

app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: true,
  })
);
app.use(cookieParser());

app.use(bodyParser.json());

const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Not allowed by CORS: " + origin), false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.set("trust proxy", 1);

app.get("/health", (_, res) => res.send("ok"));

app.use("/api/auth", authRoute);
app.use("/api/comic", comicRoute);
app.use("/api/user", userRoute);
app.use("/api/comment", commentRoute);

app.use(notFound);
app.use(errorHandler);

dbConnect();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT} (${NODE_ENV})`);
});
