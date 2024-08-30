require("dotenv").config();
const express = require("express");
const dbConnect = require("./config/db.connect");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const app = express();
const bodyParser = require('body-parser');
// const routes = require('./routes/api');
const comicRoute = require('./routes/api/comicRoute');
const userRoute = require('./routes/api/userRoute');
const authRoute = require('./routes/api/authRoute');
const commentRoute = require('./routes/api/commentRoute');
const PORT = 8888;
const router = require('express').Router();
const { notFound, errorHandler } = require("./middlewares/errorHandler");

app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ limit: '2gb', extended: true }));
app.use(morgan("dev"));
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: true,
  })
);
app.use(cookieParser());

app.use(bodyParser.json());

app.use(
  cors({
    origin: 'http://localhost:5173',
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use('/api/auth', authRoute);
app.use('/api/comic', comicRoute);
app.use('/api/user', userRoute);
app.use('/api/comment', commentRoute);

app.use(notFound);
app.use(errorHandler);


dbConnect();


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
