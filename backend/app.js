
// BACKEND: app.js - Versión optimizada y corregida
console.log('Iniciando aplicación PastelFeed...');

// Importación de módulos
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

console.log('Módulos principales importados');

// Inicialización de la aplicación Express
const app = express();
console.log('Aplicación Express inicializada');

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Conexión a la base de datos con manejo de errores
console.log('Intentando conectar a la base de datos...');
let db;
try {
  const dbPath = path.join(__dirname, 'database.sqlite');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error al abrir la conexión a la base de datos:', err.message);
      process.exit(1);
    }
    console.log('Conexión a la base de datos establecida correctamente');
  });
} catch (error) {
  console.error('Error crítico al conectar con la base de datos:', error);
  process.exit(1);
}

// Configuración de directorios para almacenamiento
console.log('Configurando directorios para almacenamiento de archivos...');
let uploadsDir, profilePhotosDir;

try {
  // Crear directorios para almacenar archivos si no existen
  uploadsDir = path.join(__dirname, 'uploads');
  profilePhotosDir = path.join(uploadsDir, 'profile_photos');

  // Asegurar que los directorios existan
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Directorio de uploads creado:', uploadsDir);
  } else {
    console.log('Directorio de uploads ya existe:', uploadsDir);
  }
  
  if (!fs.existsSync(profilePhotosDir)) {
    fs.mkdirSync(profilePhotosDir, { recursive: true });
    console.log('Directorio de fotos de perfil creado:', profilePhotosDir);
  } else {
    console.log('Directorio de fotos de perfil ya existe:', profilePhotosDir);
  }
} catch (error) {
  console.error('Error al crear directorios de almacenamiento:', error);
  console.log('Continuando ejecución a pesar del error en directorios...');
}

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profilePhotosDir);
  },
  filename: function (req, file, cb) {
    // Usa userId y timestamp para evitar colisiones de nombres
    const uniqueSuffix = `${req.user.id}-${Date.now()}`;
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${uniqueSuffix}${fileExt}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB
  },
  fileFilter: function (req, file, cb) {
    // Permitir solo imágenes
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'));
    }
    cb(null, true);
  }
});

// Configuración de CORS mejorada
console.log('Configurando CORS...');
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
    if (!origin) {
      console.log('Permitiendo solicitud sin origen');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(`Origen permitido: ${origin}`);
      callback(null, true);
    } else {
      console.log(`Permitiendo origen no listado: ${origin}`);
      // En desarrollo permitimos todos los orígenes
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Configuración de middlewares generales
console.log('Configurando middlewares...');
app.use(bodyParser.json());

// Configuración de sesión
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'pastelfeed-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true en producción con HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'lax'
  },
  name: 'pastelfeed.sid',
  rolling: true // Renueva el tiempo de expiración con cada petición
};

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Configuración de Passport
console.log('Configurando estrategias de autenticación...');
passport.use(new LocalStrategy((username, password, done) => {
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Usuario no encontrado' });
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return done(err);
      if (isMatch) return done(null, user);
      return done(null, false, { message: 'Contraseña incorrecta' });
    });
  });
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return done(err);
    done(null, user);
  });
});

// Middleware para verificar autenticación
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'No autorizado' });
}

// ===== CONFIGURACIÓN DE RUTAS ESTÁTICAS =====
// IMPORTANTE: Estos middlewares deben definirse ANTES de las rutas específicas

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend'), {
  etag: false,
  maxAge: '0'
}));

// Servir archivos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  etag: false,
  maxAge: '0'
}));

// ===== RUTAS ESPECÍFICAS =====

// Página principal
app.get('/', (req, res) => {
  console.log('Solicitud recibida para la ruta raíz /');
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Ruta explícita para index.html
app.get('/index.html', (req, res) => {
  console.log('Solicitud recibida para /index.html');
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Ruta para el feed
app.get('/feed', (req, res) => {
  console.log('Solicitud recibida para /feed');
  res.sendFile(path.join(__dirname, '../frontend/feed.html'));
});

// Redirección de feed.html a /feed
app.get('/feed.html', (req, res) => {
  console.log('Solicitud recibida para /feed.html, redirigiendo a /feed');
  res.redirect('/feed');
});

// Ruta para la página letter
app.get('/letter', (req, res) => {
  console.log('Solicitud recibida para /letter');
  res.sendFile(path.join(__dirname, '../frontend/letter.html'));
});

// Redirección de letter.html a /letter
app.get('/letter.html', (req, res) => {
  console.log('Solicitud recibida para /letter.html, redirigiendo a /letter');
  res.redirect('/letter');
});

// ===== INICIALIZACIÓN DE LA BASE DE DATOS =====
console.log('Inicializando esquema de la base de datos...');
db.serialize(() => {
  try {
    console.log('Creando tabla users si no existe...');
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      googleId TEXT UNIQUE,
      facebookId TEXT UNIQUE,
      displayName TEXT,
      photoUrl TEXT
    )`, (err) => {
      if (err) console.error('Error al crear tabla users:', err.message);
      else console.log('Tabla users verificada/creada correctamente');
    });
    
    console.log('Creando tabla messages si no existe...');
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      message TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`, (err) => {
      if (err) console.error('Error al crear tabla messages:', err.message);
      else console.log('Tabla messages verificada/creada correctamente');
    });
    
    console.log('Creando tabla saved_items si no existe...');
    db.run(`CREATE TABLE IF NOT EXISTS saved_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      itemType TEXT NOT NULL,
      itemId INTEGER,
      title TEXT,
      description TEXT,
      imageUrl TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`, (err) => {
      if (err) console.error('Error al crear tabla saved_items:', err.message);
      else console.log('Tabla saved_items verificada/creada correctamente');
    });
    
    console.log('Creando tabla letters si no existe...');
    db.run(`CREATE TABLE IF NOT EXISTS letters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`, (err) => {
      if (err) console.error('Error al crear tabla letters:', err.message);
      else console.log('Tabla letters verificada/creada correctamente');
    });
  } catch (error) {
    console.error('Error crítico durante la inicialización de la base de datos:', error);
  }
});

// ===== ENDPOINTS DE API =====

// ===== AUTENTICACIÓN =====

// Login
app.post('/api/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Error en login:', err);
      return res.status(500).json({ success: false, error: 'Error del servidor' });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: info?.message || 'Credenciales inválidas'
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error('Error en login:', err);
        return res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
      }

      const cleanUser = {...user};
      delete cleanUser.password;
      
      console.log('Login exitoso para:', cleanUser.username);
      res.json({ 
        success: true, 
        user: cleanUser,
        sessionID: req.sessionID
      });
    });
  })(req, res, next);
});

// Registro
app.post('/api/register', async (req, res) => {
  console.log('Intento de registro:', req.body);
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  
  try {
    // Verificar si el usuario o email ya existen
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT username, email FROM users WHERE username = ? OR email = ?', 
        [username, email], 
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
      });
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: "El nombre de usuario ya está en uso" });
      } else {
        return res.status(400).json({ error: "El correo electrónico ya está registrado" });
      }
    }

    // Crear el nuevo usuario
    const hash = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, password, email, displayName) VALUES (?, ?, ?, ?)',
      [username, hash, email, username],
      function(err) {
        if (err) {
          console.error('Error al insertar usuario:', err);
          return res.status(500).json({ error: "Error al registrar usuario" });
        }

        // Login automático después del registro
        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, user) => {
          if (err) {
            console.error('Error al obtener usuario:', err);
            return res.status(500).json({ error: "Error al obtener usuario" });
          }

          req.login(user, (err) => {
            if (err) {
              console.error('Error al iniciar sesión:', err);
              return res.status(500).json({ error: "Error al iniciar sesión" });
            }

            const cleanUser = {...user};
            delete cleanUser.password;
            
            console.log('Registro exitoso para:', username);
            return res.json({ 
              success: true, 
              user: cleanUser,
              message: "Usuario registrado correctamente"
            });
          });
        });
      }
    );
  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
});

// Verificación de sesión
app.get('/api/session', (req, res) => {
  if (!req.session || !req.isAuthenticated()) {
    return res.status(401).json({ 
      loggedIn: false,
      message: 'No hay sesión activa'
    });
  }

  const cleanUser = {...req.user};
  delete cleanUser.password;
  
  res.json({ 
    loggedIn: true, 
    user: cleanUser,
    sessionID: req.sessionID
  });
});

// Logout
app.get('/api/logout', (req, res) => {
  const username = req.user?.username || 'Usuario desconocido';
  
  req.logout((err) => {
    if (err) {
      console.error(`Error al cerrar sesión de ${username}:`, err);
      return res.status(500).json({ 
        success: false,
        error: 'Error al cerrar sesión'
      });
    }
    
    console.log(`Sesión cerrada para: ${username}`);
    res.json({ success: true });
  });
});

// ===== ENDPOINTS PARA PERFIL DE USUARIO =====

// Actualizar nombre de perfil
app.post('/api/profile', isAuthenticated, (req, res) => {
  const { displayName } = req.body;
  
  if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
    return res.status(400).json({ error: 'Nombre de perfil inválido' });
  }

  db.run(
    'UPDATE users SET displayName = ? WHERE id = ?',
    [displayName, req.user.id],
    function(err) {
      if (err) {
        console.error('Error al actualizar perfil:', err);
        return res.status(500).json({ error: 'Error al actualizar perfil' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      console.log(`Perfil actualizado para usuario ID ${req.user.id}`);
      res.json({ 
        success: true, 
        displayName: displayName
      });
    }
  );
});

// Endpoint de subida de fotos
app.post('/api/profile/photo', isAuthenticated, (req, res) => {
  console.log('Solicitud recibida en /api/profile/photo');
  console.log('Usuario autenticado:', req.user.id);
  
  // Primero verificamos si la columna photoUrl existe
  db.get("PRAGMA table_info(users)", (err, rows) => {
    if (err) {
      console.error('Error al verificar estructura de tabla:', err);
      return res.status(500).json({
        error: 'Error al verificar estructura de la base de datos',
        details: err.message
      });
    }
    
    // Verificar si la columna photoUrl existe
    const hasPhotoUrlColumn = rows && rows.some(row => row.name === 'photoUrl');
    
    if (!hasPhotoUrlColumn) {
      console.error('Error: La columna photoUrl no existe en la tabla users');
      // Intentamos añadir la columna
      db.run("ALTER TABLE users ADD COLUMN photoUrl TEXT", (alterErr) => {
        if (alterErr) {
          console.error('Error al añadir columna photoUrl:', alterErr);
          return res.status(500).json({
            error: 'Error al añadir columna photoUrl a la base de datos',
            details: alterErr.message
          });
        }
        console.log('Columna photoUrl añadida correctamente. Continuando con la subida de foto...');
        // Continuar con la subida después de añadir la columna
        processPhotoUpload(req, res);
      });
    } else {
      // La columna existe, continuar con la subida
      processPhotoUpload(req, res);
    }
  });
});

// Función auxiliar para procesar la subida de fotos
function processPhotoUpload(req, res) {
  // Usar middleware de multer de forma manual para manejar errores
  upload.single('photo')(req, res, async function(err) {
    if (err) {
      console.error('Error en multer:', err);
      return res.status(400).json({ 
        error: err.message || 'Error al subir la imagen', 
        details: err 
      });
    }
    
    if (!req.file) {
      console.error('No se recibió ningún archivo');
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    console.log('Archivo recibido:', req.file);

    // Crear URL relativa al servidor
    const photoUrl = `/uploads/profile_photos/${req.file.filename}`;
    
    // URL absoluta para verificar
    const absoluteUrl = path.join(__dirname, 'uploads/profile_photos', req.file.filename);
    console.log('Foto guardada en:', absoluteUrl);

    // Verificar que el archivo existe
    if (!fs.existsSync(absoluteUrl)) {
      console.error('El archivo no se guardó correctamente');
      return res.status(500).json({ error: 'Error al guardar la imagen en el servidor' });
    }

    try {
      console.log('Actualizando base de datos...');
      
      // Actualizar la URL de la foto en la base de datos
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET photoUrl = ? WHERE id = ?',
          [photoUrl, req.user.id],
          function(err) {
            if (err) {
              console.error('Error al actualizar la base de datos:', err);
              reject(err);
            } else {
              console.log(`Filas actualizadas: ${this.changes}`);
              resolve(this);
            }
          }
        );
      });

      console.log(`Foto de perfil actualizada para usuario ID ${req.user.id}: ${photoUrl}`);
      
      // Verificar que la actualización funcionó consultando la BD
      db.get('SELECT photoUrl FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) {
          console.error('Error al verificar actualización:', err);
        } else if (row) {
          console.log('Verificación de BD:', row.photoUrl);
        }
      });
      
      // Respuesta exitosa
      res.json({ 
        success: true, 
        photoUrl: photoUrl,
        userId: req.user.id,
        fileName: req.file.filename
      });
    } catch (err) {
      console.error('Error en el proceso de actualización:', err);
      return res.status(500).json({ 
        error: 'Error al actualizar foto de perfil en la base de datos',
        details: err.message
      });
    }
  });
}

// ===== ENDPOINTS PARA ELEMENTOS GUARDADOS =====

// Guardar un elemento
app.post('/api/saved-items', isAuthenticated, (req, res) => {
  const { itemType, itemId, title, description, imageUrl } = req.body;
  
  if (!itemType) {
    return res.status(400).json({ error: 'Se requiere el tipo de elemento' });
  }

  db.run(
    'INSERT INTO saved_items (userId, itemType, itemId, title, description, imageUrl) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, itemType, itemId || null, title || null, description || null, imageUrl || null],
    function(err) {
      if (err) {
        console.error('Error al guardar elemento:', err);
        return res.status(500).json({ error: 'Error al guardar elemento' });
      }

      res.json({ 
        success: true, 
        id: this.lastID,
        message: 'Elemento guardado correctamente'
      });
    }
  );
});

// Obtener elementos guardados
app.get('/api/saved-items', isAuthenticated, (req, res) => {
  db.all(
    'SELECT * FROM saved_items WHERE userId = ? ORDER BY createdAt DESC',
    [req.user.id],
    (err, items) => {
      if (err) {
        console.error('Error al obtener elementos guardados:', err);
        return res.status(500).json({ error: 'Error al obtener elementos guardados' });
      }

      res.json({ 
        success: true, 
        items: items
      });
    }
  );
});

// Eliminar elemento guardado
app.delete('/api/saved-items/:id', isAuthenticated, (req, res) => {
  const itemId = req.params.id;
  
  db.run(
    'DELETE FROM saved_items WHERE id = ? AND userId = ?',
    [itemId, req.user.id],
    function(err) {
      if (err) {
        console.error('Error al eliminar elemento guardado:', err);
        return res.status(500).json({ error: 'Error al eliminar elemento guardado' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Elemento no encontrado o no pertenece al usuario' });
      }

      res.json({ 
        success: true, 
        message: 'Elemento eliminado correctamente'
      });
    }
  );
});

// ===== ENDPOINTS PARA MENSAJES =====

// Obtener mensajes
app.get('/api/messages', isAuthenticated, (req, res) => {
  db.all(
    `SELECT m.id, m.userId, m.message, m.createdAt, u.displayName 
     FROM messages m
     LEFT JOIN users u ON m.userId = u.id
     ORDER BY m.createdAt DESC
     LIMIT 50`,
    (err, messages) => {
      if (err) {
        console.error('Error al obtener mensajes:', err);
        return res.status(500).json({ error: 'Error al obtener mensajes' });
      }

      res.json(messages);
    }
  );
});

// Enviar mensaje
app.post('/api/messages', isAuthenticated, (req, res) => {
  const { message } = req.body;
  
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Mensaje inválido' });
  }

  db.run(
    'INSERT INTO messages (userId, message) VALUES (?, ?)',
    [req.user.id, message],
    function(err) {
      if (err) {
        console.error('Error al enviar mensaje:', err);
        return res.status(500).json({ error: 'Error al enviar mensaje' });
      }

      res.json({ 
        success: true, 
        id: this.lastID,
        message: 'Mensaje enviado correctamente'
      });
    }
  );
});

// ===== ENDPOINTS PARA LETTER =====

// Obtener datos del usuario para letter
app.get('/api/letter/user', isAuthenticated, (req, res) => {
  // Devolver el nombre del usuario y otra información necesaria
  const cleanUser = {...req.user};
  delete cleanUser.password;
  
  res.json({
    success: true,
    user: {
      id: cleanUser.id,
      username: cleanUser.username,
      displayName: cleanUser.displayName || cleanUser.username,
      photoUrl: cleanUser.photoUrl
    }
  });
});

// Crear o actualizar una carta
app.post('/api/letter/save', isAuthenticated, (req, res) => {
  const { title, content } = req.body;
  
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'El contenido de la carta no puede estar vacío' });
  }

  // Primero verificamos si ya existe una carta del usuario
  db.get(
    'SELECT id FROM letters WHERE userId = ?',
    [req.user.id],
    (err, letter) => {
      if (err) {
        console.error('Error al verificar carta existente:', err);
        return res.status(500).json({ error: 'Error al verificar carta existente' });
      }

      if (letter) {
        // Actualizar carta existente
        db.run(
          'UPDATE letters SET title = ?, content = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
          [title || 'Sin título', content, letter.id],
          function(err) {
            if (err) {
              console.error('Error al actualizar carta:', err);
              return res.status(500).json({ error: 'Error al actualizar carta' });
            }

            res.json({
              success: true,
              id: letter.id,
              message: 'Carta actualizada correctamente'
            });
          }
        );
      } else {
        // Crear nueva carta
        db.run(
          'INSERT INTO letters (userId, title, content) VALUES (?, ?, ?)',
          [req.user.id, title || 'Sin título', content],
          function(err) {
            if (err) {
              console.error('Error al crear carta:', err);
              return res.status(500).json({ error: 'Error al crear carta' });
            }

            res.json({
              success: true,
              id: this.lastID,
              message: 'Carta creada correctamente'
            });
          }
        );
      }
    }
  );
});

// Obtener la carta del usuario
app.get('/api/letter', isAuthenticated, (req, res) => {
  db.get(
    'SELECT * FROM letters WHERE userId = ?',
    [req.user.id],
    (err, letter) => {
      if (err) {
        console.error('Error al obtener carta:', err);
        return res.status(500).json({ error: 'Error al obtener carta' });
      }

      res.json({
        success: true,
        letter: letter || null
      });
    }
  );
});

// ===== MANEJO DE ERRORES Y RUTAS NO ENCONTRADAS =====

// Manejador de rutas API no encontradas
app.use('/api', (req, res) => {
  console.log(`API ruta no encontrada: ${req.originalUrl}`);
  return res.status(404).json({ 
    error: 'Ruta API no encontrada',
    path: req.originalUrl
  });
});

// Manejador de rutas API no encontradas
app.use('/api', (req, res) => {
  console.log(`API ruta no encontrada: ${req.originalUrl}`);
  return res.status(404).json({ 
    error: 'Ruta API no encontrada',
    path: req.originalUrl
  });
});

// Servir archivos estáticos adicionales antes del manejo de rutas no encontradas
app.get('/:file', (req, res, next) => {
  const filePath = path.join(__dirname, '../frontend', req.params.file);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  next();
});

// Redirigir todas las demás rutas a index.html
app.use((req, res) => {
  console.log(`Ruta no encontrada: ${req.path}, redirigiendo a index.html`);
  res.redirect('/');
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error en la aplicación:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });
  
  // Determinar si es una solicitud API
  const isApiRequest = req.originalUrl && req.originalUrl.startsWith('/api/');
  
  if (isApiRequest) {
    // Para solicitudes API, devolver JSON
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
  } else {
    // Para solicitudes de frontend, redirigir a la página principal
    console.log('Redirigiendo a página principal debido a error');
    return res.redirect('/');
  }
});

// ===== INICIAR SERVIDOR =====
const PORT = 3001;
try {
  const server = app.listen(PORT, () => {
    console.log(`✅ Servidor iniciado correctamente en puerto ${PORT}`);
    console.log(`📱 API disponible en http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend disponible en http://localhost:${PORT}/index.html`);
    console.log(`🔄 Fecha y hora de inicio: ${new Date().toISOString()}`);
  });
  
  // Manejar errores del servidor
  server.on('error', (error) => {
    console.error('❌ Error en el servidor:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ El puerto ${PORT} ya está en uso. Intente con otro puerto.`);
    }
  });
} catch (error) {
  console.error('❌ Error crítico al iniciar el servidor:', error);
}

// ===== MANEJO DE CIERRE DE LA APLICACIÓN =====
process.on('SIGINT', () => {
  console.log('Cerrando aplicación...');
  if (db) {
    console.log('Cerrando conexión a la base de datos...');
    db.close((err) => {
      if (err) {
        console.error('Error al cerrar la base de datos:', err.message);
      } else {
        console.log('Conexión a la base de datos cerrada correctamente');
      }
      process.exit(err ? 1 : 0);
    });
  } else {
    process.exit(0);
  }
});
