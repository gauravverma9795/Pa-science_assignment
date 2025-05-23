/**
 * Utility script to seed the database with sample data
 * Run with: npm run seed-data
 */

const mongoose = require('mongoose');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password123',
    role: 'user'
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Task.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const createdUsers = await User.create(users);
    console.log(`Created ${createdUsers.length} users`);

    // Create tasks
    const tasks = [];
    const statuses = ['todo', 'in-progress', 'done'];
    const priorities = ['low', 'medium', 'high'];

    for (let i = 1; i <= 15; i++) {
      const randomUserIndex = Math.floor(Math.random() * createdUsers.length);
      const assignedTo = createdUsers[randomUserIndex]._id;
      const createdBy = createdUsers[0]._id; // Admin creates all tasks

      tasks.push({
        title: `Task ${i}`,
        description: `This is a description for task ${i}. This is a sample task created by the seed script.`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        dueDate: new Date(Date.now() + Math.floor(Math.random() * 15) * 24 * 60 * 60 * 1000), // Random date in next 15 days
        assignedTo,
        createdBy
      });
    }

    const createdTasks = await Task.create(tasks);
    console.log(`Created ${createdTasks.length} tasks`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

// Run the function
seedDatabase();