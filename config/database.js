const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Crear usuario admin si no existe
    await createAdminUser();
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
      
      await User.create({
        name: 'Administrador TD_NICAS',
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        phone: '+505 8888-8888'
      });
      
      console.log('✅ Usuario administrador creado automáticamente');
      console.log(`📧 Email: ${process.env.ADMIN_EMAIL}`);
      console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD}`);
    }
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error.message);
  }
};

module.exports = connectDB;