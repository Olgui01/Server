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


// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());
app.use(cors());


//db
conectarDB();
const client = new MongoClient(process.env.MONGO_URI);




// //modelo
// const Register = {

//   id: { type: Number, required: true }, // ID como número entero
//   img: { type: String, default: null },
//   name: { type: String, required: true },
//   number: { type: String, required: true },
//   descripcion: { type: String },
//   createdAt: { type: Date, default: Date.now }
// }

// archivo public





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
        fs.unlinkSync('./public/Product/' + file[index]);
        fs.unlinkSync('./public/ProductOptimize/' + file[index]);
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


function imgsEdit(id, imgs) {

  return new Promise(async (resolve, reject) => {
    const setA = new Set(imgs);
    try {
      const { file } = await getCollection().findOne({ id }, { projection: { _id: 0, file: 1 } });
      const imgsDelete = file.filter((item) => !setA.has(item));
      if (imgsDelete[0] != undefined) {
        imgsDelete.map(item => {
          fs.unlinkSync('./public/Product/' + item);
          fs.unlinkSync('./public/ProductOptimize/' + item);
        });
      }

      resolve(state);
    } catch (e) {
      resolve(imgs);
    }
  })

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

      // if (result.modifiedCount === 0) {
      //   console.log("⚠️ No se encontró el documento o no se modificó.");
      //   reject("No se modificó");
      // } else {

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
      document.file = filesExistentes;
    }
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

// app.post("/searchC", (req, res) => {
//   const {} = req.body;
// });



app.post('/register', upload, (req, res) => {
  const item = req.body;
  const file = req.files.map((file) => {
    sharp(`./public/product/${file.filename}`)                     // Imagen original
      .resize(700, 500)                    // Redimensionar a 800x600
      .jpeg({ quality: 70 })
      .toFile(`./public/ProductOptimize/${file.filename}`)               // Guardar como output.jpg
      .catch(err => console.error('Error:', err)); return file.filename;
  });
  insertItem(item, file).then((id) => { res.json(id) }).catch();
});



app.post('/edit', upload, (req, res) => {

  const { id, imgs, title, price, category, numbers, descripcion } = req.body;
  var img = JSON.parse(imgs);
  if (req.files[0] != undefined) {
    var files = req.files;
    files.map((file) => {
      const i = img.indexOf(file.originalname);
      img[i] = file.filename;
      sharp(`./public/product/${file.filename}`)                     // Imagen original
        .resize(700, 500)                    // Redimensionar a 800x600
        .jpeg({ quality: 70 })
        .toFile(`./public/ProductOptimize/${file.filename}`)               // Guardar como output.jpg
        .catch(err => console.error('Error:', err));
    });
  }
  imgsEdit(parseInt(id), img)
    .then((file) => {
      edit({ id: id, file, title, price, category, numbers, descripcion })
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(400))
    })
    .catch();

});
// app.post('/edit', (req, res) => {
//   const { id, name, price, numbers, descripcion } = req.body;
//   const request = req.body;
//   update(request).then(() => res.sendStatus(200)).catch(() => res.sendStatus(400))
//   console.log(`\nid:${id}\nname:${name}\nprice:${price}\nnubers:${numbers}\ndescripcion:${descripcion}\n`);
// });


app.use('/Product', express.static("./public/product"));
app.use('/ProductOptimize', express.static("./public/ProductOptimize"));
app.listen(3000, () => console.log("Server ready on port 3000."));