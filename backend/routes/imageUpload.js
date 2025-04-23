const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateUser } = require('../middleware/auth');

// Configuración de almacenamiento para multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Directorio base para guardar imágenes
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Crear el directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Crear directorio para imágenes del feed
    const feedDir = path.join(uploadDir, 'feed');
    if (!fs.existsSync(feedDir)) {
      fs.mkdirSync(feedDir, { recursive: true });
    }
    
    // Directorio específico del usuario
    const userDir = path.join(feedDir, req.user.id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre de archivo único usando timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = 'feed-image-' + uniqueSuffix + extension;
    cb(null, filename);
  }
});

// Filtro para permitir solo ciertos tipos de archivos
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten JPG, PNG, GIF y WebP.'), false);
  }
};

// Configurar multer con nuestras opciones
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: fileFilter
});

// Modelo para guardar información de las imágenes en la base de datos
// Nota: Esto es un esquema de ejemplo, ajústalo según tu base de datos
const saveImageRecord = async (userId, type, filename, path) => {
  try {
    // Aquí implementarías la lógica para guardar en tu base de datos
    // Por ejemplo, con MongoDB podrías usar un modelo como:
    // const image = new Image({ userId, type, filename, path });
    // await image.save();
    
    // Para esta implementación, usaremos un enfoque simple de archivo JSON
    const dbFile = path.join(__dirname, '../data/images.json');
    
    // Crear el archivo si no existe
    if (!fs.existsSync(dbFile)) {
      fs.writeFileSync(dbFile, JSON.stringify({ images: [] }));
    }
    
    // Leer el archivo existente
    const data = JSON.parse(fs.readFileSync(dbFile));
    
    // Añadir nuevo registro
    const newImage = {
      id: Date.now().toString(),
      userId,
      type,
      filename,
      path,
      createdAt: new Date().toISOString()
    };
    
    // Si ya existe una imagen del mismo tipo para este usuario, reemplazarla
    data.images = data.images.filter(img => !(img.userId === userId && img.type === type));
    data.images.push(newImage);
    
    // Guardar el archivo
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
    
    return newImage;
  } catch (error) {
    console.error('Error al guardar registro de imagen:', error);
    throw error;
  }
};

// Ruta para obtener la imagen de feed del usuario actual
router.get('/user/feed-image', authenticateUser, async (req, res) => {
  try {
    // En una implementación real, buscarías en tu base de datos
    const dbFile = path.join(__dirname, '../data/images.json');
    
    if (!fs.existsSync(dbFile)) {
      return res.status(404).json({ error: 'No se encontraron imágenes' });
    }
    
    const data = JSON.parse(fs.readFileSync(dbFile));
    const userImage = data.images.find(img => img.userId === req.user.id.toString() && img.type === 'feed');
    
    if (!userImage) {
      return res.status(404).json({ error: 'No se encontró imagen de feed para este usuario' });
    }
    
    // Devolver la URL relativa para la imagen
    const imageUrl = `/uploads/feed/${req.user.id}/${userImage.filename}`;
    
    return res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Error al obtener imagen del feed:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para subir una imagen
router.post('/upload/image', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }
    
    // Tipo de imagen (feed u otro)
    const imageType = req.body.type || 'feed';
    
    // Ruta relativa para acceder desde el navegador
    const relativePath = `/uploads/feed/${req.user.id}/${req.file.filename}`;
    
    // Guardar registro en la "base de datos"
    await saveImageRecord(
      req.user.id.toString(),
      imageType,
      req.file.filename,
      req.file.path
    );
    
    return res.json({
      success: true,
      imageUrl: relativePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Middleware para manejar errores de multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Tamaño máximo: 10MB' });
    }
    return res.status(400).json({ error: `Error en la carga: ${err.message}` });
  } else if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

module.exports = router;