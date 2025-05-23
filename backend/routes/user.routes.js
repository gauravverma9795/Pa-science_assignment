const express = require('express');
const { check } = require('express-validator');
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes in this router
router.use(protect);

// Admin-only routes
router.get('/', authorize('admin'), userController.getUsers);

router.post(
  '/',
  authorize('admin'),
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('role', 'Role must be either user or admin').isIn(['user', 'admin'])
  ],
  userController.createUser
);

router.get('/:id', authorize('admin'), userController.getUserById);

router.put(
  '/:id',
  authorize('admin'),
  [
    check('name', 'Name is required').optional().not().isEmpty(),
    check('email', 'Please include a valid email').optional().isEmail(),
    check('role', 'Role must be either user or admin').optional().isIn(['user', 'admin'])
  ],
  userController.updateUser
);

router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;