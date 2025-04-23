// Este es un fragmento que debes añadir a tu archivo server.js existente
// Asegúrate de colocarlo en el lugar apropiado junto con las demás rutas

// Importar las rutas para la carga de imágenes
const imageUploadRoutes = require('./routes/imageUpload');

// Middleware para servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Usar las rutas de subida de imágenes
app.use('/api', imageUploadRoutes);

// Asegúrate de que este código esté antes de tus rutas generales de manejo 404 o errores