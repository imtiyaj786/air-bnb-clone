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
const Booking = require("./models/Booking.js");
// for rename file on server using fs
const fs = require("fs");

require("dotenv").config();

app.use(express.json());
app.use(cookieParser());

const bcryptSalt = bcrypt.genSaltSync(10);
const jsonWebTokenSecret = "akfhcjbdhsdbf";

// for access images on uploads folders.
app.use("/uploads", express.static(__dirname + "/uploads"));

// this end point is used to connect with react js.
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);

// console.log(process.env.MONGODB_URL);

// Here connected Express js to mongo db data base.
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

// this for testing api with both side.
app.get("/test", (req, res) => {
  res.json("test hello ok");
});

// for getting user data
function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    jsonWebToken.verify(
      req.cookies.token,
      jsonWebTokenSecret,
      {},
      async (error, userData) => {
        if (error) throw error;
        resolve(userData);
      }
    );
  });
}

// This is post request for register user. (used in RegisterPage.jsx)
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

// This is post request for login user. (used in LoginPage.jsx)
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

//  This is used for login user profile. (used in UserContext.jsx)
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

// This ent point is used for log out user. (used in ProfilePage.jsx)
app.post("/logout", (req, res) => {
  res.cookie("token", "").json(true);
});

// This end point is used for upload images by using links. (used in PhotosUploader.jsx)
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

// This end point is used for upload images through computer. (used in API - Uploads folders)
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
    uploadedFiles.push(newPath.replace(/^uploads\\/, ""));
  }
  res.json(uploadedFiles);
});

// This end point is used for save new places in mongoDB. (used in PlacesFormPage.jsx)
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

// This end point is used for getting added places from mongo DB. (used in PlacesPage.jsx)
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

// This end point is used to open current places by using their Ids. (used in PlacePage.jsx & PlacesFormPage.jsx)
app.get("/places/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Place.findById(id));
});

// This end point is used for update places. (used in PLaceFormPage.jsx)
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

// This end point is used for showing all places on index page. (used in IndexPage.jsx)
app.get("/places", async (req, res) => {
  res.json(await Place.find());
});

// This end point is used for saved bookings places in Mongo BD. (used in BookingWidget.jsx)
app.post("/bookings", async (req, res) => {
  const userData = await getUserDataFromReq(req);
  const { place, checkIn, checkOut, numberOfGuests, name, phone, price } =
    req.body;
  Booking.create({
    place,
    checkIn,
    checkOut,
    numberOfGuests,
    name,
    phone,
    price,
    user: userData.id,
  })
    .then((doc) => {
      res.json(doc);
    })
    .catch((error) => {
      throw error;
    });
});

// This end point is used for getting all booking records into database and showing into react js page.
// (used in BookingPage.jsx and BookingsPage.jsx)
app.get("/bookings", async (req, res) => {
  const userData = await getUserDataFromReq(req);
  res.json(await Booking.find({ user: userData.id }).populate("place"));
});

// This is used for listen APIs on 4000 end point. (used in App.jsx)
app.listen(4000, () => {
  console.log("listening on port 4000");
});
