const swaggerJSDoc = require("swagger-jsdoc");

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EVID-DGC API",
      version: "1.0.0",
      description: "Evidence & Case Management System API Documentation",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Server",
      },
    ],
    components: {
      securitySchemes: {
        UserWallet: {
          type: "apiKey",
          in: "header",
          name: "x-user-wallet",
        },
        AdminWallet: {
          type: "apiKey",
          in: "header",
          name: "x-admin-wallet",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Unauthorized access" },
          },
        },
      },
    },
  },
  apis: ["./routes/*.js", "./server.js"],
});

module.exports = swaggerSpec;
