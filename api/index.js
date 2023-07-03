const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User.js");
const jsonWebToken = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const imageDownloader = require("image-downloader");
const multer = require("multer");
const Place = require("./models/Place.js");
// for rename file on server using fs
const fs = require("fs");
require("dotenv").config();

app.use(express.json());
app.use(cookieParser());

const bcryptSalt = bcrypt.genSaltSync(10);
const jsonWebTokenSecret = "akfhcjbdhsdbf";

// for access images
app.use("/uploads", express.static(__dirname + "/uploads"));

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);
// console.log(process.env.MONGODB_URL);
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

// this is for logout
app.post("/logout", (req, res) => {
  res.cookie("token", "").json(true);
});

// for file upload from link
app.post("/upload-by-link", async (req, res) => {
  const { link } = req.body;
  // newName is used for uploaded image name
  const newName = "photo" + Date.now() + ".jpg";
  await imageDownloader.image({
    url: link, // The URL of the page to download images from
    dest: __dirname + "/uploads/" + newName, // Where should downloaded files be saved?
  });
  res.json(newName);
});

// direct upload images
const photoMiddleware = multer({ dest: "uploads/" });
app.post("/uploads", photoMiddleware.array("photos", 100), (req, res) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    // console.log("1 ---> ", newPath.replace(/^uploads\\/, ""));
    fs.renameSync(path, newPath);
    // uploadedFiles.push(newPath.replace("uploads/", ""));
    uploadedFiles.push(newPath.replace(/^uploads\\/, ""));
  }
  res.json(uploadedFiles);
});

// here added new places
app.post("/places", (req, res) => {
  const { token } = req.cookies;
  const {
    title,
    address,
    addedPhotos,
    description,
    price,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
  } = req.body;
  jsonWebToken.verify(
    token,
    jsonWebTokenSecret,
    {},
    async (error, userData) => {
      if (error) throw error;
      const placeDoc = await Place.create({
        owner: userData.id,
        title,
        address,
        photos: addedPhotos,
        description,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
        price,
      });
      res.json(placeDoc);
    }
  );
});

// Here getting added places from dataBase

app.get("/user-places", (req, res) => {
  const { token } = req.cookies;
  jsonWebToken.verify(
    token,
    jsonWebTokenSecret,
    {},
    async (error, userData) => {
      if (error) throw error;
      const { id } = userData;
      res.json(await Place.find({ owner: id }));
    }
  );
});

// for existing place
app.get("/places/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Place.findById(id));
});

// for update places
app.put("/places", async (req, res) => {
  const { token } = req.cookies;
  const {
    id,
    title,
    address,
    addedPhotos,
    description,
    price,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
  } = req.body;
  jsonWebToken.verify(
    token,
    jsonWebTokenSecret,
    {},
    async (error, userData) => {
      if (error) throw error;
      const placeDoc = await Place.findById(id);
      if (userData.id === placeDoc.owner.toString()) {
        placeDoc.set({
          title,
          address,
          photos: addedPhotos,
          description,
          perks,
          extraInfo,
          checkIn,
          checkOut,
          maxGuests,
          price,
        });
        await placeDoc.save();
        res.json("ok saved success");
      }
    }
  );
});

// for showing places on index page
app.get("/places", async (req, res) => {
  res.json(await Place.find());
});

app.listen(4000, () => {
  console.log("listening on port 4000");
});
