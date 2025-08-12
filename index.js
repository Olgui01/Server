const express = require('express');
const cors = require('cors');
const path = require("path");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const conectarDB = require('./db');
const sharp = require("sharp");
const fs = require('fs');
const app = express();

// Multer en memoria
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() }).array('img');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Conexión DB
conectarDB();
const client = new MongoClient(process.env.MONGO_URI);

function getCollection() {
  return client.db('Server').collection('Register');
}

// Funciones de base de datos (sin cambios importantes)
async function showItems(category) {
  try {
    let document = await client.db('Server').collection('Register')
      .find({ category }, { projection: { _id: 0, id: 1, file: { $slice: 1 }, title: 1, price: 1, numbers: 1, category: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    document = document.map(item => {
      const file = item.file[0];
      if (!file || !fs.existsSync(`./public/ProductOptimize/${file}`)) {
        item.file = [];
      }
      return item;
    });

    return document;
  } catch (error) {
    throw error;
  }
}

async function showItem() {
  try {
    let document = await client.db('Server').collection('Register')
      .find({}, { projection: { _id: 0, id: 1, file: { $slice: 1 }, title: 1, price: 1, numbers: 1, category: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    document = document.map(item => {
      const file = item.file[0];
      if (!file || !fs.existsSync(`./public/ProductOptimize/${file}`)) {
        item.file = [];
      }
      return item;
    });

    return document;
  } catch (error) {
    throw error;
  }
}

function insertItem({ title, price, category, numbers, descripcion }, file) {
  return getCollection().insertOne({
    id: Date.now(),
    file,
    title,
    price,
    category,
    numbers,
    descripcion,
    createdAt: new Date()
  }).then(result => result.insertedId);
}

function imgsEdit(id, imgs) {
  return getCollection().findOne({ id }, { projection: { _id: 0, file: 1 } })
    .then(({ file }) => {
      const imgsDelete = file.filter(f => !imgs.includes(f));
      imgsDelete.forEach(item => {
        if (fs.existsSync(`./public/Product/${item}`)) fs.unlinkSync(`./public/Product/${item}`);
        if (fs.existsSync(`./public/ProductOptimize/${item}`)) fs.unlinkSync(`./public/ProductOptimize/${item}`);
      });
      return imgs;
    });
}

function edit({ id, file, title, price, category, numbers, descripcion }) {
  return getCollection().updateOne(
    { id: parseInt(id) },
    { $set: { file, title, price, category, numbers, descripcion } }
  );
}

// Rutas
app.get('/show/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const items = category === "Todo" ? await showItem() : await showItems(category);
    res.json(items.map(i => ({ ...i, file: i.file[0] })));
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get('/', async (req, res) => {
  try {
    const items = await showItem();
    res.json(items.map(i => ({ ...i, file: i.file[0] })));
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// Registrar producto (procesa en memoria)
app.post('/register', upload, async (req, res) => {
  try {
    const item = req.body;
    const fileNames = [];

    for (const file of req.files) {
      const fileName = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
      fileNames.push(fileName);

      // Guardar original
      fs.writeFileSync(`./public/Product/${fileName}`, file.buffer);

      // Guardar optimizado
      await sharp(file.buffer)
        .resize(700, 500)
        .jpeg({ quality: 70 })
        .toFile(`./public/ProductOptimize/${fileName}`);
    }

    await insertItem(item, fileNames);
    res.json({ success: true, files: fileNames });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Editar producto (procesa en memoria)
app.post('/edit', upload, async (req, res) => {
  try {
    const { id, imgs, title, price, category, numbers, descripcion } = req.body;
    let imgList = JSON.parse(imgs);

    for (const file of req.files) {
      const fileName = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
      const idx = imgList.indexOf(file.originalname);
      if (idx >= 0) imgList[idx] = fileName;
      else imgList.push(fileName);

      fs.writeFileSync(`./public/Product/${fileName}`, file.buffer);

      await sharp(file.buffer)
        .resize(700, 500)
        .jpeg({ quality: 70 })
        .toFile(`./public/ProductOptimize/${fileName}`);
    }

    const finalFiles = await imgsEdit(parseInt(id), imgList);
    await edit({ id, file: finalFiles, title, price, category, numbers, descripcion });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Archivos estáticos
app.use('/Product', express.static("./public/Product"));
app.use('/ProductOptimize', express.static("./public/ProductOptimize"));

app.listen(3000, () => console.log("Server ready on port 3000."));
