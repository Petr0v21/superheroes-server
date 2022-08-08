import express from "express";
import cors from "cors";
import fs from "fs";
import mongoose from "mongoose";
import multer from "multer";
import bodyParser from "body-parser";
import path, { dirname } from "path";

const app = express();
const __dirname = dirname(path.resolve());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
const { Schema } = mongoose;
//required: true
const heroSchema = Schema({
  nickname: { type: String },
  real_name: { type: String },
  origin_description: { type: String },
  superpowers: { type: String || Boolean },
  catch_phrase: { type: String },
  images: [
    {
      data: Buffer,
      contentType: String,
    },
  ],
});

const Hero = mongoose.model("Hero", heroSchema);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});

var upload = multer({ storage: storage });

app.post("/heros/create", upload.array("images"), async (req, res) => {
  try {
    console.log(req.body);
    console.log(req.files);
    const check = await Hero.findOne({ nickname: req.body.nickname });
    if (!check) {
      if (req.files !== []) {
        const images = req.files.map((file) =>
          fs.readFileSync(
            path.join(__dirname + "/server/uploads/" + file.filename)
          )
        );
        // console.log(images);
        const img64 = images.map((image) => image.toString("base64"));
        // console.log(img64);
        const imagesBuffer = [];
        img64.map((img, index) => {
          imagesBuffer.push({
            data: Buffer.from(img, "base64"),
            contentType: req.files[index].mimetype,
          });
        });
        console.log(imagesBuffer);
        const hero = new Hero({
          ...req.body,
          images: imagesBuffer,
        });
        hero.save();
      } else {
        const hero = new Hero({
          ...req.body,
        });
        hero.save();
      }
      res.status(200).json({ message: "Hero has been created" });
    } else {
      res.status(500).json({ message: "Hero already exists" });
    }
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
    throw error;
  }
});

app.post("/heros/update", upload.array("images"), async (req, res) => {
  try {
    console.log(req.body);
    console.log(req.body.idDelete);
    if (req.files.length !== 0 || req.body.idDelete !== "") {
      const images = req.files.map((file) =>
        fs.readFileSync(
          path.join(__dirname + "/server/uploads/" + file.filename)
        )
      );
      const img64 = images.map((image) => image.toString("base64"));
      const imagesBuffer = [];
      img64.map((img, index) => {
        imagesBuffer.push({
          data: Buffer.from(img, "base64"),
          contentType: req.files[index].mimetype,
        });
      });
      const oldHero = await Hero.findById(req.body._id);
      console.log(oldHero);
      if (oldHero.images) {
        console.log(oldHero.images.length);
        if (req.body.idDelete) {
          const idDeleteArray = req.body.idDelete.split(",");
          console.log(idDeleteArray);
          oldHero.images.map((img, index) => {
            let bool = true;
            for (let i = 1; i < idDeleteArray.length; i++) {
              if (idDeleteArray[i] === img._id.toString()) {
                bool = false;
              }
            }
            if (bool === true) {
              imagesBuffer.push(img);
            }
          });
        }
        console.log(imagesBuffer.length);
      }
      Hero.findByIdAndUpdate(
        req.body._id,
        {
          ...req.body,
          images: imagesBuffer,
        },
        (err, docs) => {
          if (err) {
            res.status(500).json({ message: err });
          } else {
            console.log("Updated Docs : ");
          }
        }
      );
    } else {
      console.log(req.body);
      console.log("efwe3fe");
      Hero.findByIdAndUpdate(
        req.body._id,
        {
          ...req.body,
        },
        (err, docs) => {
          if (err) {
            res.status(500).json({ message: err });
          } else {
            // console.log("Updated Docs : ", docs);
          }
        }
      );
    }
    res.status(200).json({ message: "Hero has been updated" });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
    throw error;
  }
});

const deletedHero = async (data) => {
  try {
    console.log(data);
    Hero.deleteOne({ _id: data.id })
      .then(() => {
        console.log("Hero deleted");
      })
      .catch(function (error) {
        console.log(error);
      });
  } catch (error) {
    throw error;
  }
};

app.post("/heros/list", async (req, res) => {
  try {
    let heroes = await Hero.find({}, null, {
      limit: 5,
      skip: (req.body.page - 1) * 5,
    });
    const lengthListPages = Math.ceil((await Hero.count()) / 5);
    const amount = [];
    for (let i = 1; i <= lengthListPages; i++) {
      amount.push(i);
    }
    const images = [];
    heroes.map((hero) => {
      const listImg64 = [];
      if (hero.images !== undefined) {
        hero.images.map((img) => {
          const data = Buffer.from(img.data);
          const data64 = data.toString("base64");
          listImg64.push(data64);
        });
      }
      images.push({ id: hero._id, data: listImg64 });
    });
    res.send({ list: heroes, pages: amount, images: images });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
    throw error;
  }
});

app.post("/heros/delete", async (req, res) => {
  try {
    await deletedHero(req.body);
    res.status(200).json({ message: "Hero has been deleted" });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
    throw error;
  }
});

const start = async () => {
  const PORT = 5000;
  try {
    await mongoose.connect(
      "mongodb+srv://user:010101@cluster0.akk6d.mongodb.net/?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
  } catch (e) {
    console.log("Server Error:", e.message);
    process.exit(1);
  }
};

start();
