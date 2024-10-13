const express = require('express');
const requestLogger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const { validateSearch } = require('./middleware/validator');
const searchRoutes = require('./routes/searchRoutes');
const config = require('./config/config');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

const app = express();
//app.use(bodyParser.json());

// Enable CORS for your frontend before other middlewares
app.use(cors({
    origin: 'https://sec-ui.knc.lv',  // Replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Allow specific methods
    credentials: true  // Allow credentials if needed
}));

// Middlewares
app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter);

// Routes
app.use('/api', searchRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

// Swagger options
const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: "Cyber Leaks API",
            version: '1.0.0',
            description: "Cyber Leaks API Documentation"
        }
    },
    apis: ['./routes/*.js'],  // Update this path based on your project structure
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Error Handler
app.use(errorHandler);

// Start server
const server = app.listen(config.server.port, () => {
    console.log(`Server running on port ${config.server.port}`);
});

// Graceful Error Handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message, err.stack);
    // Log the error but do not exit
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Log the error but do not exit
});
