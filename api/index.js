const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User.js");
const jsonWebToken = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

app.use(express.json());
app.use(cookieParser());

const bcryptSalt = bcrypt.genSaltSync(10);
const jsonWebTokenSecret = "akfhcjbdhsdbf";

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);
console.log(process.env.MONGODB_URL);
// Here connected to mongo db data base
mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// this for testing api with both side
app.get("/test", (req, res) => {
  res.json("test hello ok");
});

// this is post request for register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  // here create new users
  try {
    const userNewDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    res.json(userNewDoc);
  } catch (e) {
    res.status(422).json(e);
  }
});

// this is post request for login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const userVerifyDoc = await User.findOne({ email });
  if (userVerifyDoc) {
    const passwordMatch = bcrypt.compareSync(password, userVerifyDoc.password);
    if (passwordMatch) {
      jsonWebToken.sign(
        {
          email: userVerifyDoc.email,
          id: userVerifyDoc._id,
          //   name: userVerifyDoc.name,
        },
        jsonWebTokenSecret,
        {},
        (error, token) => {
          if (error) {
            throw error;
          } else {
            res.cookie("token", token).json(userVerifyDoc);
          }
        }
      );
    } else {
      res.status(422).json("password not match");
    }
  } else {
    res.json("Email not found");
  }
});

//  this is used for profile

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  if (token) {
    jsonWebToken.verify(
      token,
      jsonWebTokenSecret,
      {},
      async (error, userCookieData) => {
        if (error) throw error;
        const { name, email, _id } = await User.findById(userCookieData.id);
        res.json({ name, email, _id });
      }
    );
  } else {
    res.json(null);
  }
});

app.listen(4000, () => {
  console.log("listening on port 4000");
});
