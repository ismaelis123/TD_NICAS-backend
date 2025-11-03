const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      if (!user.isActive || user.isBlocked) {
        return res.status(401).json({
          success: false,
          message: 'Tu cuenta está bloqueada o desactivada'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Error en auth middleware:', error);
      return res.status(401).json({
        success: false,
        message: 'Token no válido'
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'No hay token, autorización denegada'
    });
  }
};

const admin = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren privilegios de administrador'
      });
    }
  } catch (error) {
    console.error('Error en admin middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error de servidor'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { protect, admin, optionalAuth };