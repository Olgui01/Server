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

const multer = require("multer");
const upload = multer({
  storage: multer.diskStorage({
    destination: './public/Product',
    filename: (req, file, done) => {
      done(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }

  })
}).array('img');

const uploadFile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const { id } = req.body;

      const Path = './public/Files/' + id;
      if (!fs.existsSync(Path)) {
        fs.mkdirSync(Path)
      }
      cb(null, Path);
    },
    filename: (req, file, cb) => cb(null, file.originalname)
  })
}).array('file');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());
app.use(cors());


//db
conectarDB();
const client = new MongoClient(process.env.MONGO_URI);


// Conexión a MongoDB Atlas
function getCollection() {
  return client.db('Server').collection('Register');
}

async function showItems(category) {
  return new Promise(async (resolve, reject) => {

    try {
      var document = await client.db('Server').collection('Register').find({ category: `${category}` }, { projection: { _id: 0, id: 1, file: { $slice: 1 }, title: 1, price: 1, numbers: 1, category: 1 } }).sort({ createdAt: -1 }).toArray();
      for (let index = 0; index < document.length; index++) {
        const file = document[index].file[0];
        fileExists = await fs.existsSync('./public/ProductOptimize/' + file);
        if (file != undefined && fileExists == false) {
          document[index].file = [];
        }
      }

      resolve(document);
    } catch (error) {
      reject();
    }
  });
}


async function showItem() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = client.db('Server');
      const colletion_ = db.collection("Register");
      //show data default *
      // const document = await colletion_.find().limit(10).sort({ createdAt: -1 }).toArray();

      //show spesific
      var document = await colletion_.find({}, { projection: { _id: 0, id: 1, file: { $slice: 1 }, title: 1, price: 1, numbers: 1, category: 1 } }).sort({ createdAt: -1 }).toArray();

      for (let index = 0; index < document.length; index++) {
        const file = document[index].file[0];
        fileExists = await fs.existsSync('./public/ProductOptimize/' + file);
        if (file != undefined && fileExists == false) {
          document[index].file = [];
        }
      }
      resolve(document);
    } catch (error) {
      reject(error);
    }
  });
}


function insertItem({ title, price, category, numbers, descripcion }, file) {
  return new Promise(async (resolve, reject) => {
    const id = Date.now();
    try {
      await getCollection().insertOne({ id, file, title, price, category, numbers, descripcion, createdAt: new Date() });
      resolve(id);
    } catch (error) {
      reject();
    }
  });
}

function category() {
  return new Promise(async (resolve, reject) => {
    try {
      const rows = await getCollection().distinct("category");
      resolve(rows)
    } catch (error) {
      reject();
    }
  })
}

function drop(id) {

  return new Promise(async (resolve, reject) => {
    try {
      const { file } = await getCollection().findOne({ id }, { projection: { _id: 0, file: 1 } });

      for (let index = 0; index < file.length; index++) {
        if (fs.existsSync('./public/Product/' + file[index])) {
          fs.unlinkSync('./public/Product/' + file[index]);
        }
        if (fs.existsSync('./public/ProductOptimize/' + file[index])) {
          fs.unlinkSync('./public/ProductOptimize/' + file[index]);
        }
      }
      const result = await client.db('Server').collection('Register').deleteOne({ id: parseInt(id) });
      if (result.deletedCount == 0) {
        reject();
      } else {
        resolve();
      }
    } catch (e) {
      reject();
    }
    // const request = client.db('Server').collection('Register').deleteOne({ id });
    // console.log(request);
  });
}

async function filterimgs(files, imgs, id) {
  for (let index = 0; index < files.length; index++) {
    const i = imgs.indexOf(files[index].originalname);
    imgs[i] = files[index].filename;
    sharp(`./public/Product/${files[index].filename}`)                     // Imagen original
      .resize(700, 500)                    // Redimensionar a 800x600
      .jpeg({ quality: 70 })
      .toFile(`./public/ProductOptimize/${files[index].filename}`)               // Guardar como output.jpg
      .catch(err => console.error('Error:', err));
  }
  const set = new Set(imgs);

  const { file } = await getCollection().findOne({ id }, { projection: { _id: 0, file: 1 } });
  for (let index = 0; index < file.length; index++) {
    if (!set.has(file[index])) {
      const product = `./public/Product/${file[index].filename}`;
      const productoptimize = `/public/ProductOptimize/${file[index].filename}`;
      if (fs.existsSync(product)) {
        fs.unlinkSync(product);
      }
      if (fs.existsSync(productoptimize)) {
        fs.unlinkSync(productoptimize);
      }
    }
  }
  return imgs;

}


function edit({ id, file, title, price, category, numbers, descripcion }) {
  return new Promise(async (resolve, reject) => {
    try {
      await getCollection().updateOne(
        { id: parseInt(id) }, // Usa parseInt solo si el id en la DB es numérico
        {
          $set: {
            file,
            title,
            price,
            category,
            numbers,
            descripcion
          }
        }
      );

      resolve();
      // }
    } catch (e) {

      reject(e);
    }
  });
}



app.get('/show/:category', (req, res) => {
  const { category } = req.params;

  if (category == "Todo") {
    showItem().then((item) => { item = item.map((item) => { item.file = item.file[0]; return item; }); res.json(item); }).catch((e) => { console.log(e) });
  } else {

    showItems(category).then((item) => { item = item.map((item) => { item.file = item.file[0]; return item; }); res.json(item); }).catch((e) => { console.log(e) });
  }


});

app.get('/', (req, res) => {
  showItem().then((item) => { item = item.map((item) => { item.file = item.file[0]; return item; }); res.json(item); }).catch((e) => { console.log(e) });
});

app.get("/ShowItem/:id", async (req, res) => {
  try {
    var { id } = req.params;
    id = parseInt(id);
    var document = await getCollection().findOne({ id }, { projection: { _id: 0 } });
    const { file } = document;

    if (file && file.length > 0) {
      const filePathBase = './public/ProductOptimize/';

      // Filtrar los archivos que realmente existen
      const filesExistentes = file.filter(name => {
        const ruta = filePathBase + name;
        return fs.existsSync(ruta);
      });

      document.filehtml = (fs.existsSync('./public/Files/' + id + '/index.html')) ? true : false;
      document.file = filesExistentes;
    }
    console.log(document);
    res.json(document);
  } catch (error) {
    res.sendStatus(400);
  }
}
);
app.get("/category", async (req, res) => {
  category().then((item) => res.json(item)).catch(() => res.sendStatus(400));
});

app.get("/Delet/:id", (req, res) => {
  const { id } = req.params;
  drop(parseInt(id))
    .then(() => { res.sendStatus(200) })
    .catch(() => { res.sendStatus(400) });
});

app.get("/search/:title/:category", async (req, res) => {
  const { title, category } = req.params;
  var find0 = { title: { $regex: `^${title}`, $options: "i" }, };
  if (category != 'Todo') {
    find0.category = category;
  }
  var document = await client.db('Server').collection('Register').find(find0, { projection: { _id: 0, id: 1, file: { $slice: 1 }, title: 1, price: 1, numbers: 1, category: 1 } }).sort({ createdAt: -1 }).toArray();
  for (let index = 0; index < document.length; index++) {
    const file = document[index].file[0];
    fileExists = await fs.existsSync('./public/ProductOptimize/' + file);
    if (file != undefined && fileExists == false) {
      document[index].file = [];
    }
    document[index].file = document[index].file[0];
  }
  console.log(document)
  res.json((document[0] == undefined) ? [null] : document);
});


app.post('/register', upload, (req, res) => {
  const item = req.body;
  const file = req.files.map((file) => {
    sharp(`./public/Product/${file.filename}`)                     // Imagen original
      .resize(800, 600)                    // Redimensionar a 800x600
      .jpeg({ quality: 70 })
      .toFile(`./public/ProductOptimize/${file.filename}`)               // Guardar como output.jpg
      .catch(err => console.error('Error:', err)); return file.filename;
  });
  insertItem(item, file).then((id) => { res.json(id) }).catch();
});



app.post('/edit', upload, async (req, res) => {
  const { imgs, title, price, category, numbers, descripcion } = req.body;
  const id = parseInt(req.body.id);

  const file = await filterimgs(req.files, JSON.parse(imgs), id);

  edit({ id, file, title, price, category, numbers, descripcion })
    .then(() => res.sendStatus(200))
    .catch(() => res.sendStatus(400));
});


function deleteFiles(showFiles, setFile, path) {
  return new Promise((resolve, reject) => {
    try {
      const set = new Set(setFile);
      // setFile = showFiles.filter((item) => !set.has(item))
      for (let index = 0; index < showFiles.length; index++) {
        if (set.has(showFiles[index])) {
          fs.unlinkSync(path + showFiles[index]);
        }
      }

      resolve();
    } catch (error) {
      console.log(error);
      reject();
    }
  })
}

app.post('/upFile', uploadFile, (req, res,) => {
  const { id, files } = req.body;
  console.log(id, files);
  var dir = fs.readdirSync('./public/Files/' + id);
  deleteFiles(dir, JSON.parse(files), `./public/Files/${id}/`)
    .then(() => res.sendStatus(200))
    .catch(() => res.sendStatus(400));
});

app.get('/upFile/:id', (req, res) => {
  const { id } = req.params;
  const pathfile = './public/Files/' + id;
  const state = fs.existsSync(pathfile);
  if (state) {
    const files = fs.readdirSync(pathfile);
    res.json(files);
  } else {
    res.sendStatus(400);
  }
});


app.use('/Render', express.static("./public/Files"));
app.use('/Product', express.static("./public/Product"));
app.use('/ProductOptimize', express.static("./public/ProductOptimize"));
app.listen(3000, () => console.log("Server ready on port 3000."));