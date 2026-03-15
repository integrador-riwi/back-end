import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API Documentation',
    version: '1.0.0',
    description: 'Documentación generada con Swagger',
  },
  servers: [
    {
      url: 'http://localhost:3010', // Actualizado a 3010
      description: 'Servidor local',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/modules/**/*.js'], // Ajusta la ruta según donde estén tus rutas/controllers
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
