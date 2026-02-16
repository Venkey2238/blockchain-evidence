const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EVID-DGC API Documentation',
      version: '2.0.0',
      description: 'Blockchain Evidence Management System API - Working Endpoints',
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Development' },
      { url: 'https://blockchain-evidence.onrender.com/api', description: 'Production' },
    ],
  },
  apis: ['./server.js'],
};

const specs = swaggerJsdoc(options);

// Working endpoints documentation
specs.paths = {
  '/health': {
    get: {
      summary: 'Health check',
      responses: {
        200: { description: 'Server healthy' },
      },
    },
  },
  '/auth/email-login': {
    post: {
      summary: 'Email login',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              properties: {
                email: { type: 'string' },
                password: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Login successful' },
        401: { description: 'Invalid credentials' },
      },
    },
  },
  '/evidence/upload': {
    post: {
      summary: 'Upload evidence',
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              properties: {
                file: { type: 'string', format: 'binary' },
                caseId: { type: 'string' },
                type: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Upload successful' },
      },
    },
  },
  '/admin/users': {
    get: {
      summary: 'Get users (Admin)',
      responses: {
        200: { description: 'Users list' },
      },
    },
  },
};

module.exports = { specs, swaggerUi };
