const Post = require('../models/Post');
const User = require('../models/User');

// @desc    Crear nuevo post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Debes subir una imagen'
      });
    }

    const post = await Post.create({
      user: req.user.id,
      content: content || '',
      image: req.file.filename,
      imageUrl: `/uploads/images/${req.file.filename}`
    });

    // Popular datos del usuario
    await post.populate('user', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Post creado exitosamente',
      data: post
    });
  } catch (error) {
    console.error('Error creando post:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener todos los posts
// @route   GET /api/posts
// @access  Public
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtrar solo posts activos y no bloqueados
    const filter = { 
      isActive: true, 
      isBlocked: false 
    };

    const posts = await Post.find(filter)
      .populate('user', 'name avatar')
      .populate('comments.user', 'name avatar')
      .populate('likes', 'name avatar')
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

// @desc    Obtener posts de un usuario
// @route   GET /api/posts/user/:userId
// @access  Public
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ 
      user: req.params.userId, 
      isActive: true,
      isBlocked: false
    })
    .populate('user', 'name avatar')
    .populate('likes', 'name avatar')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error obteniendo posts de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener un post específico
// @route   GET /api/posts/:id
// @access  Public
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name avatar')
      .populate('comments.user', 'name avatar')
      .populate('likes', 'name avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    if (!post.isActive || post.isBlocked) {
      return res.status(404).json({
        success: false,
        message: 'Este post no está disponible'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error obteniendo post:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Dar like a un post
// @route   PUT /api/posts/:id/like
// @access  Private
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    if (!post.isActive || post.isBlocked) {
      return res.status(404).json({
        success: false,
        message: 'Este post no está disponible'
      });
    }

    // Verificar si ya dio like
    const alreadyLiked = post.likes.includes(req.user.id);

    if (alreadyLiked) {
      // Quitar like
      post.likes = post.likes.filter(like => 
        like.toString() !== req.user.id
      );
    } else {
      // Agregar like
      post.likes.push(req.user.id);
    }

    await post.save();
    await post.populate('likes', 'name avatar');

    res.json({
      success: true,
      message: alreadyLiked ? 'Like removido' : 'Like agregado',
      data: {
        likes: post.likes,
        likesCount: post.likes.length
      }
    });
  } catch (error) {
    console.error('Error en like:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Agregar comentario
// @route   POST /api/posts/:id/comment
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El comentario no puede estar vacío'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    if (!post.isActive || post.isBlocked) {
      return res.status(404).json({
        success: false,
        message: 'Este post no está disponible'
      });
    }

    const comment = {
      user: req.user.id,
      text: text.trim()
    };

    post.comments.push(comment);
    await post.save();

    // Popular el último comentario
    await post.populate('comments.user', 'name avatar');

    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comentario agregado',
      data: newComment
    });
  } catch (error) {
    console.error('Error agregando comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Eliminar post (solo admin o dueño)
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Verificar si es el dueño o admin
    if (post.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este post'
      });
    }

    await Post.findByIdAndDelete(req.params.id);

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

// @desc    Reportar post
// @route   POST /api/posts/:id/report
// @access  Private
exports.reportPost = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar una razón para reportar'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post no encontrado'
      });
    }

    // Verificar si ya reportó este post
    const alreadyReported = post.reports.some(
      report => report.user.toString() === req.user.id
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'Ya has reportado este post'
      });
    }

    post.reports.push({
      user: req.user.id,
      reason: reason.trim()
    });

    await post.save();

    res.json({
      success: true,
      message: 'Post reportado correctamente'
    });
  } catch (error) {
    console.error('Error reportando post:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};