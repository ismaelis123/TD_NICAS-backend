const express = require('express');
const {
  getStats,
  getUsers,
  getPosts,
  blockUser,
  blockPost,
  deleteUser,
  deletePost,
  getReportedPosts
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación y rol de admin
router.use(protect);
router.use(admin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/posts', getPosts);
router.get('/reports', getReportedPosts);
router.put('/users/:id/block', blockUser);
router.put('/posts/:id/block', blockPost);
router.delete('/users/:id', deleteUser);
router.delete('/posts/:id', deletePost);

module.exports = router;