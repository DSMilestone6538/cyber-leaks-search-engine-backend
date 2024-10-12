const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error(`Error: ${err.message}`, { stack: err.stack });

    // Respond with an error message but do not crash the service
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });

    // Do not call `next(err)` to avoid letting Express crash the server
};

module.exports = errorHandler;
