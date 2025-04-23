// Script para añadir manualmente la columna photoUrl a la tabla users
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta a la base de datos
const dbPath = path.join(__dirname, 'database.sqlite');
console.log('Conectando a la base de datos en:', dbPath);

// Conectar a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    process.exit(1);
  }
  console.log('Conexión establecida con la base de datos SQLite');
});

// Verificar si la tabla users existe
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, table) => {
  if (err) {
    console.error('Error al verificar tabla users:', err.message);
    closeAndExit(1);
  }
  
  if (!table) {
    console.log('La tabla users no existe. Creándola...');
    db.run(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      googleId TEXT UNIQUE,
      facebookId TEXT UNIQUE,
      displayName TEXT,
      photoUrl TEXT
    )`, (err) => {
      if (err) {
        console.error('Error al crear tabla users:', err.message);
        closeAndExit(1);
      }
      console.log('Tabla users creada correctamente');
      closeAndExit(0);
    });
  } else {
    console.log('La tabla users existe. Verificando columnas...');
    // Verificar si la columna photoUrl existe
    db.all("PRAGMA table_info(users)", (err, columns) => {
      if (err) {
        console.error('Error al verificar columnas:', err.message);
        closeAndExit(1);
      }
      
      const hasPhotoUrl = columns.some(col => col.name === 'photoUrl');
      
      if (hasPhotoUrl) {
        console.log('La columna photoUrl ya existe en la tabla users');
        closeAndExit(0);
      } else {
        console.log('La columna photoUrl no existe. Añadiéndola...');
        db.run("ALTER TABLE users ADD COLUMN photoUrl TEXT", (err) => {
          if (err) {
            console.error('Error al añadir columna photoUrl:', err.message);
            closeAndExit(1);
          }
          console.log('Columna photoUrl añadida correctamente');
          closeAndExit(0);
        });
      }
    });
  }
});

function closeAndExit(code) {
  db.close((err) => {
    if (err) {
      console.error('Error al cerrar la base de datos:', err.message);
    } else {
      console.log('Conexión a la base de datos cerrada');
    }
    process.exit(code);
  });
}