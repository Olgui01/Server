const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI);

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








