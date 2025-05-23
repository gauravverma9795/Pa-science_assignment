const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/user.model');

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

// Connect to test database before running tests
beforeAll(async () => {
  const testMongoUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/task-management-test';
  await mongoose.connect(testMongoUri);
});

// Clean up after tests
afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe('Auth API', () => {
  // Test user registration
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toEqual(testUser.name);
      expect(res.body.email).toEqual(testUser.email);
    });

    it('should not register user with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('User already exists');
    });

    it('should not register user with invalid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: 'invalid-email',
          password: '123'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  // Test user login
  describe('POST /api/auth/login', () => {
    it('should login user with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toEqual(testUser.name);
      expect(res.body.email).toEqual(testUser.email);
    });

    it('should not login user with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid credentials');
    });

    it('should not login user with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid credentials');
    });
  });

  // Test user profile access
  describe('GET /api/auth/profile', () => {
    let token;

    beforeAll(async () => {
      // Login to get token
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      token = res.body.token;
    });

    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toEqual(testUser.name);
      expect(res.body.email).toEqual(testUser.email);
      expect(res.body).not.toHaveProperty('password');
    });

    it('should not access profile without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Not authorized to access this route');
    });

    it('should not access profile with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid token');
    });
  });
});