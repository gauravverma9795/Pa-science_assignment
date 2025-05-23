const socketIo = require('socket.io');

let io;

// Initialize socket.io
exports.initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
    
    // Join task-specific room for updates
    socket.on('joinTask', (taskId) => {
      socket.join(`task-${taskId}`);
      console.log(`Client joined task room: task-${taskId}`);
    });
    
    // Leave task room
    socket.on('leaveTask', (taskId) => {
      socket.leave(`task-${taskId}`);
      console.log(`Client left task room: task-${taskId}`);
    });
  });

  return io;
};

// Emit task update event
exports.emitTaskUpdate = (taskId, data) => {
  if (io) {
    io.to(`task-${taskId}`).emit('taskUpdate', data);
    console.log(`Emitted taskUpdate event for task ${taskId}`);
  }
};

// Emit task creation event
// Continuing from where we left off...

// Emit task creation event
exports.emitTaskCreated = (data) => {
  if (io) {
    io.emit('taskCreated', data);
    console.log(`Emitted taskCreated event for task ${data._id}`);
  }
};

// Emit task deletion event
exports.emitTaskDeleted = (taskId) => {
  if (io) {
    io.emit('taskDeleted', { taskId });
    console.log(`Emitted taskDeleted event for task ${taskId}`);
  }
};

// Get socket.io instance
exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};