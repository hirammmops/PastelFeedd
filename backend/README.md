# Backend para iphone-store

Este directorio contiene el código del backend para el proyecto iphone-store, incluyendo la API para manejo de imágenes, autenticación y otras funcionalidades.

## Requisitos

- Node.js (v14 o superior)
- npm o yarn

## Instalación

1. Instala las dependencias necesarias:

```bash
npm install express multer cors body-parser path fs cookie-parser
```

O si usas yarn:

```bash
yarn add express multer cors body-parser path fs cookie-parser
```

2. Asegúrate de que exista el directorio para almacenar datos:

```bash
mkdir -p data
```

## Estructura del proyecto

```
backend/
├── data/          # Almacenamiento de datos JSON (simulando una base de datos)
├── middleware/    # Middleware de autenticación y otros
├── routes/        # Rutas de la API
├── uploads/       # Directorio para archivos subidos
│   └── feed/      # Imágenes específicas del feed
├── server.js      # Punto de entrada principal
└── README.md      # Este archivo
```

## Ejecutar el servidor

Para iniciar el servidor en modo desarrollo:

```bash
node server.js
```

O si tienes nodemon instalado:

```bash
nodemon server.js
```

El servidor se ejecutará por defecto en `http://localhost:3001`.

## API Endpoints

### Autenticación

- `POST /api/login` - Iniciar sesión
- `POST /api/register` - Registrar nuevo usuario
- `GET /api/session` - Verificar sesión activa
- `GET /api/logout` - Cerrar sesión

### Perfil de usuario

- `POST /api/profile` - Actualizar perfil
- `POST /api/profile/photo` - Actualizar foto de perfil

### Carga de imágenes

- `POST /api/upload/image` - Subir una imagen (requiere autenticación)
- `GET /api/user/feed-image` - Obtener la imagen de feed del usuario actual

### Mensajes

- `GET /api/messages` - Obtener mensajes del chat
- `POST /api/messages` - Enviar un mensaje al chat

### Elementos guardados

- `GET /api/saved-items` - Obtener elementos guardados
- `POST /api/saved-items` - Guardar un nuevo elemento
- `DELETE /api/saved-items/:id` - Eliminar un elemento guardado

## Notas de implementación

Este backend utiliza archivos JSON para almacenar datos, lo que es útil para desarrollo y pruebas. En un entorno de producción, deberías considerar usar una base de datos real como MongoDB, PostgreSQL o MySQL.