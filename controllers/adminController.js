const User = require('../models/User');
const Post = require('../models/Post');

// @desc    Obtener estadísticas generales
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true, isBlocked: false });
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const blockedPosts = await Post.countDocuments({ isBlocked: true });
    
    // Posts por día (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentPosts = await Post.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Usuarios nuevos (últimos 7 días)
    const newUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPosts,
        activeUsers,
        blockedUsers,
        blockedPosts,
        recentPosts,
        newUsers
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener todos los usuarios
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const search = req.query.search || '';
    
    let filter = {};
    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener todos los posts
// @route   GET /api/admin/posts
// @access  Private/Admin
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.status === 'blocked') {
      filter.isBlocked = true;
    } else if (req.query.status === 'active') {
      filter.isBlocked = false;
      filter.isActive = true;
    }

    const posts = await Post.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Error obteniendo posts:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Bloquear/Desbloquear usuario
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
exports.blockUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.params.id;

    // No permitir bloquear al admin principal
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes bloquear tu propia cuenta'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.isBlocked = !user.isBlocked;
    user.blockReason = user.isBlocked ? (reason || 'Bloqueado por el administrador') : '';
    
    await user.save();

    res.json({
      success: true,
      message: user.isBlocked ? 'Usuario bloqueado' : 'Usuario desbloqueado',
      data: user
    });
  } catch (error) {
    console.error('Error bloqueando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Bloquear/Desbloquear post
// @route   PUT /api/admin/posts/:id/block
// @access  Private/Admin
exports.blockPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    post.isBlocked = !post.isBlocked;
    post.blockReason = post.isBlocked ? (reason || 'Bloqueado por el administrador') : '';
    
    await post.save();
    await post.populate('user', 'name email');

    res.json({
      success: true,
      message: post.isBlocked ? 'Post bloqueado' : 'Post desbloqueado',
      data: post
    });
  } catch (error) {
    console.error('Error bloqueando post:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Eliminar usuario
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // No permitir eliminar al admin principal
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar todos los posts del usuario
    await Post.deleteMany({ user: userId });
    
    // Eliminar el usuario
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Usuario y sus posts eliminados correctamente'
    });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Eliminar post
// @route   DELETE /api/admin/posts/:id
// @access  Private/Admin
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    await Post.findByIdAndDelete(postId);

    res.json({
      success: true,
      message: 'Post eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando post:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener posts reportados
// @route   GET /api/admin/reports
// @access  Private/Admin
exports.getReportedPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      'reports.0': { $exists: true } // Posts que tienen al menos un reporte
    })
    .populate('user', 'name email')
    .populate('reports.user', 'name email')
    .sort({ 'reports': -1 })
    .skip(skip)
    .limit(limit);

    const total = await Post.countDocuments({
      'reports.0': { $exists: true }
    });

    res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Error obteniendo posts reportados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};