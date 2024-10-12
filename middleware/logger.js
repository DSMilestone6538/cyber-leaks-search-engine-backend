const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

        if (res.statusCode >= 500) {
            // Log server errors as 'error'
            logger.error(logMessage);
        } else if (res.statusCode >= 400) {
            // Log client errors as 'warn'
            logger.warn(logMessage);
        } else {
            // Log successful requests as 'info'
            logger.info(logMessage);
        }
    });

    next();
};

module.exports = requestLogger;
