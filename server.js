const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./config/database');

// Conectar a la base de datos
connectDB();

const app = express();

// Configuración CORS para desarrollo - permite cualquier origen
app.use(cors({
  origin: '*', // Cuando tengas frontend, cambia esto por tu URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Crear directorio de uploads si no existe
const uploadsDir = path.j
oin(__dirname, 'uploads/images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Directorio de uploads creado');
}

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar rutas
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const adminRoutes = require('./routes/admin');

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/admin', adminRoutes);

// Ruta de bienvenida mejorada
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Bienvenido a TD_NICAS API - Backend Solo',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    status: '✅ Funcionando correctamente',
    documentation: {
      auth: 'POST /api/auth/register | login',
      posts: 'GET/POST /api/posts', 
      admin: 'GET /api/admin/stats (requiere admin)',
      health: 'GET /health'
    },
    next_steps: [
      '1. Configurar MongoDB Atlas',
      '2. Probar endpoints con Postman/Thunder Client',
      '3. Desplegar en Render.com',
      '4. Crear frontend después'
    ]
  });
});

// Health check mejorado
app.get('/health', (req, res) => {
  const healthData = {
    success: true,
    message: '✅ TD_NICAS Backend - Saludable',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Atlas', // Cambia según tu configuración
    version: '1.0.0',
    uptime: `${Math.floor(process.uptime())} segundos`
  };
  
  res.json(healthData);
});

// Ruta de información de la API
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    app: 'TD_NICAS - Plataforma Social',
    description: 'Backend para compartir imágenes y mensajes',
    features: [
      '✅ Registro y autenticación de usuarios',
      '✅ Subida de imágenes (sin videos)',
      '✅ Sistema de likes y comentarios',
      '✅ Panel de administración completo',
      '✅ Moderación de contenido',
      '✅ API RESTful'
    ],
    tech_stack: {
      backend: 'Node.js + Express',
      database: 'MongoDB Atlas',
      authentication: 'JWT',
      file_upload: 'Multer'
    },
    admin_access: 'Solo usuario administrador'
  });
});

// Manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    suggestion: 'Visita / para ver los endpoints disponibles'
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('❌ Error:', error.message);
  
  // Error de multer
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'El archivo es demasiado grande. Máximo 10MB'
    });
  }
  
  if (error.message && error.message.includes('Solo se permiten archivos de imagen')) {
    return res.status(400).json({
      success: false,
      message: 'Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP, etc.)'
    });
  }
  
  // No mostrar detalles internos en producción
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : error.message;

  res.status(500).json({
    success: false,
    message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 TD_NICAS BACKEND - SOLO API');
  console.log('='.repeat(60));
  console.log(`📍 Servidor: http://localhost:${PORT}`);
  console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`👑 Admin: ${process.env.ADMIN_EMAIL}`);
  console.log(`💾 Database: ${process.env.MONGODB_URI ? 'Conectado' : 'Por configurar'}`);
  console.log('='.repeat(60));
  console.log('📖 Endpoints principales:');
  console.log(`   → GET  /              - Información de la API`);
  console.log(`   → GET  /health        - Estado del servidor`);
  console.log(`   → POST /api/auth/register - Registrar usuario`);
  console.log(`   → POST /api/auth/login    - Iniciar sesión`);
  console.log(`   → GET  /api/posts      - Listar posts`);
  console.log(`   → POST /api/posts      - Crear post (con imagen)`);
  console.log('='.repeat(60));
});