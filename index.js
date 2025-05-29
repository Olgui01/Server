const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const conectarDB = require('./db');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
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



// Conexión a MongoDB Atlas
function getCollection() {
  return client.db('Server').collection('Register');
}

async function showItem() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = client.db('Server');
      const colletion_ = db.collection("Register");
      //show data default *
      // const document = await colletion_.find().limit(10).sort({ createdAt: -1 }).toArray();

      //show spesific
      const document = await colletion_.find({}, { projection: { _id: 0, id: 1, title: 1 } }).limit(10).sort({ createdAt: -1 }).toArray();
      resolve(document);
    } catch (error) {
      reject(error);
    }
  });
}

function showItem1() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = client.db('Server');
      const colletion_ = db.collection("Register");
      //show data default *
      // const document = await colletion_.find().limit(10).sort({ createdAt: -1 }).toArray();

      //show spesific
      const document = await colletion_.find({}, { projection: { _id: 0, id: 1, title: 1 } }).sort({ createdAt: -1 }).toArray();
      resolve(document);
    } catch (error) {
      reject(error);
    }

  });
}

function insertItem({ title, price, numbers, descripcion }) {
  return new Promise(async (resolve, reject) => {
    const id = Date.now();
    try {
      await getCollection().insertOne({ id, title, price, numbers, descripcion, createdAt: new Date() });
      resolve(id);
    } catch (error) {
      reject();
    }
  });
}

function update({ id,
  title, price, numbers, descripcion }) {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await getCollection().updateOne(
        { id: parseInt(id) }, // Usa parseInt solo si el id en la DB es numérico
        {
          $set: {
            title,
            price,
            numbers,
            descripcion
          }
        }
      );

      if (result.modifiedCount === 0) {
        console.log("⚠️ No se encontró el documento o no se modificó.");
        reject("No se modificó");
      } else {
        console.log("✅ Documento actualizado correctamente.");
        resolve();
      }
    } catch (e) {
      console.log("❌ Error al actualizar:", e);
      reject(e);
    }
  });
}


function drop(id) {
  return new Promise(async (resolve, reject) => {
    console.log("---------------", parseInt(id));
    try {
      const result = await client.db('Server').collection('Register').deleteOne({ id: parseInt(id) });
      console.log('---->', result.deletedCount);
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

app.get('/', (req, res) => {
  showItem().then((item) => { res.json(item) }).catch((e) => { console.log(e) });
});
app.get("/ShowItem/:id", async (req, res) => {
  try {
    var { id } = req.params;
    id = parseInt(id);
    const rows = await getCollection().findOne({ id }, { projection: { _id: 0 } });
    console.log(rows);
    res.json(rows);
  } catch (error) {
    res.sendStatus(400);
  }

});

app.get("/Delet/:id", (req, res) => {
  const { id } = req.params;
  drop(id)
    .then(() => { res.sendStatus(200) })
    .catch(() => { res.sendStatus(400) });
});

app.get("/search/:title", async (req, res) => {
  const { title } = req.params;
  console.log(title[0]);
  const row = await client.db('Server').collection('Register').find({ title: { $regex: `^${title}`, $options: "i" } }).sort({ createdAt: -1 }).toArray();
  res.json(row);
});


app.get("/1", (req, res) => {
  showItem1().then((item) => { res.json(item) }).catch((e) => { console.log(e) });
});
app.post('/register', (req, res) => {
  const item = req.body;
  insertItem(item).then((id) => { res.json(id) }).catch();
  console.log(req.body);
});

app.post('/edit', (req, res) => {
  const { id, name, price, numbers, descripcion } = req.body;
  const request = req.body;
  update(request).then(() => res.sendStatus(200)).catch(() => res.sendStatus(400))
  console.log(`\nid:${id}\nname:${name}\nprice:${price}\nnubers:${numbers}\ndescripcion:${descripcion}\n`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
