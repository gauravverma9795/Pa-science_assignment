const { validationResult } = require('express-validator');
const Task = require('../models/task.model');
const fs = require('fs');
const path = require('path');
const socketUtils = require('../utils/socket');
const { safelyDeleteFile } = require('../utils/fileUtils');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    // Regular users can only see tasks assigned to them or created by them
    if (req.user.role !== 'admin') {
      filter.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }
    
    // Apply filters from query params
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    
    // Date range filter
    if (req.query.fromDate && req.query.toDate) {
      filter.dueDate = {
        $gte: new Date(req.query.fromDate),
        $lte: new Date(req.query.toDate)
      };
    } else if (req.query.fromDate) {
      filter.dueDate = { $gte: new Date(req.query.fromDate) };
    } else if (req.query.toDate) {
      filter.dueDate = { $lte: new Date(req.query.toDate) };
    }
    
    // Sorting
    const sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by created date desc
    }
    
    // Execute query with pagination and filters
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination info
    const total = await Task.countDocuments(filter);
    
    res.json({
      tasks,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user has permission to view this task
    if (req.user.role !== 'admin' && 
        task.assignedTo._id.toString() !== req.user._id.toString() && 
        task.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this task' });
    }
    
    res.json(task);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { title, description, status, priority, dueDate, assignedTo } = req.body;
    
    // Create task
    const task = new Task({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate,
      assignedTo,
      createdBy: req.user._id
    });
    
    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      const attachedDocuments = req.files.map(file => ({
        fileName: file.originalname,
        filePath: file.path,
        fileType: file.mimetype,
        fileSize: file.size
      }));
      
      task.attachedDocuments = attachedDocuments;
    }
    
    const createdTask = await task.save();
    
    // Populate user details before sending response
    await createdTask.populate('assignedTo', 'name email');
    await createdTask.populate('createdBy', 'name email');
    
    // Emit socket event for real-time updates
    socketUtils.emitTaskCreated(createdTask);
    
    res.status(201).json(createdTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { title, description, status, priority, dueDate, assignedTo } = req.body;
    
    // Find task
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user has permission to update this task
    if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }
    
    // Update fields
    if (title) task.title = title;
    if (description) task.description = description;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;
    if (assignedTo) task.assignedTo = assignedTo;
    
    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      const newDocuments = req.files.map(file => ({
        fileName: file.originalname,
        filePath: file.path,
        fileType: file.mimetype,
        fileSize: file.size
      }));
      
      task.attachedDocuments = [...task.attachedDocuments, ...newDocuments];
    }
    
    const updatedTask = await task.save();
    
    // Populate user details before sending response
    await updatedTask.populate('assignedTo', 'name email');
    await updatedTask.populate('createdBy', 'name email');
    
    // Emit socket event for real-time updates
    socketUtils.emitTaskUpdate(req.params.id, updatedTask);
    
    res.json(updatedTask);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user has permission to delete this task
    if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }
    
    // Delete attached files
    if (task.attachedDocuments && task.attachedDocuments.length > 0) {
      task.attachedDocuments.forEach(doc => {
        safelyDeleteFile(doc.filePath);
      });
    }
    
    await task.deleteOne();
    
    // Emit socket event for real-time updates
    socketUtils.emitTaskDeleted(req.params.id);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Remove document from task
// @route   DELETE /api/tasks/:id/documents/:docId
// @access  Private
exports.removeDocument = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user has permission
    if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }
    
    // Find the document
    const document = task.attachedDocuments.id(req.params.docId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete the file
    safelyDeleteFile(document.filePath);
    
    // Remove from array
    task.attachedDocuments.pull(req.params.docId);
    await task.save();
    
    // Emit socket event for real-time updates
    socketUtils.emitTaskUpdate(req.params.id, task);
    
    res.json({ message: 'Document removed successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Task or document not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Download document
// @route   GET /api/tasks/:id/documents/:docId/download
// @access  Private
exports.downloadDocument = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user has permission to view this task
    if (req.user.role !== 'admin' && 
        task.assignedTo.toString() !== req.user._id.toString() && 
        task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this task' });
    }
    
    // Find the document
    const document = task.attachedDocuments.id(req.params.docId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const filePath = document.filePath;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.download(filePath, document.fileName);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Task or document not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};