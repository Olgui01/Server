const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb+srv://456olguinwer:3ph0seGYJsbKM0Op@cluster0.xuc1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

async function conectarDB() {
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('❌ Error al conectar MongoDB:', error);
    process.exit(1);
  }
}
module.exports = conectarDB;








