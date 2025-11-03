const express = require('express');
const {
  createPost,
  getPosts,
  getUserPosts,
  getPost,
  likePost,
  addComment,
  deletePost,
  reportPost
} = require('../controllers/postController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.route('/')
  .get(optionalAuth, getPosts)
  .post(protect, upload.single('image'), createPost);

router.get('/user/:userId', optionalAuth, getUserPosts);
router.get('/:id', optionalAuth, getPost);
router.put('/:id/like', protect, likePost);
router.post('/:id/comment', protect, addComment);
router.post('/:id/report', protect, reportPost);
router.delete('/:id', protect, deletePost);

module.exports = router;