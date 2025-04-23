-- Crear base de datos:
CREATE DATABASE IF NOT EXISTS pastelfeed CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pastelfeed;

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    googleId TEXT UNIQUE,
    facebookId TEXT UNIQUE,
    displayName TEXT
);

-- Mensajes del chat global
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    message TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);
