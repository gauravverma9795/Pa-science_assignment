const express = require('express');
const { check } = require('express-validator');
const taskController = require('../controllers/task.controller');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

// Protect all routes in this router
router.use(protect);

// Get all tasks
router.get('/', taskController.getTasks);

// Get task by ID
router.get('/:id', taskController.getTaskById);

// Create a new task
router.post(
  '/',
  upload.array('documents', 3), // Max 3 documents
  [
    check('title', 'Title is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('dueDate', 'Due date is required').isISO8601(),
    check('assignedTo', 'Assigned to is required').isMongoId(),
    check('status', 'Status must be valid').optional().isIn(['todo', 'in-progress', 'done']),
    check('priority', 'Priority must be valid').optional().isIn(['low', 'medium', 'high'])
  ],
  taskController.createTask
);

// Update task
router.put(
  '/:id',
  upload.array('documents', 3), // Max 3 documents
  [
    check('title', 'Title is required').optional().not().isEmpty(),
    check('description', 'Description is required').optional().not().isEmpty(),
    check('dueDate', 'Due date must be valid').optional().isISO8601(),
    check('assignedTo', 'Assigned to must be valid').optional().isMongoId(),
    check('status', 'Status must be valid').optional().isIn(['todo', 'in-progress', 'done']),
    check('priority', 'Priority must be valid').optional().isIn(['low', 'medium', 'high'])
  ],
  taskController.updateTask
);

// Delete task
router.delete('/:id', taskController.deleteTask);

// Remove document from task
router.delete('/:id/documents/:docId', taskController.removeDocument);

// Download document
router.get('/:id/documents/:docId/download', taskController.downloadDocument);

module.exports = router;