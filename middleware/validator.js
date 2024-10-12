const { query, validationResult } = require('express-validator');
const logger = require('../utils/logger'); // Import the logger

exports.validateSearch = [
    query('query').notEmpty().withMessage('Search query is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Log validation errors and the invalid input
            logger.warn(`Validation failed for query: ${req.query.query}, Errors: ${JSON.stringify(errors.array())}`);

            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
