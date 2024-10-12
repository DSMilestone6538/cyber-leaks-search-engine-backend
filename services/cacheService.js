const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes
const logger = require('../utils/logger'); // Assuming you have a logger utility

exports.getCache = (key) => {
    try {
        const value = cache.get(key);
        if (value === undefined) {
            logger.info(`Cache miss for key: ${key}`);
            return null;
        }
        logger.info(`Cache hit for key: ${key}`);
        return value;
    } catch (error) {
        logger.error(`Failed to get cache for key: ${key}, Error: ${error.message}`);
        return null; // Fallback to returning null if there's an error
    }
};

exports.setCache = (key, value) => {
    try {
        cache.set(key, value);
        logger.info(`Cache set for key: ${key}`);
    } catch (error) {
        logger.error(`Failed to set cache for key: ${key}, Error: ${error.message}`);
    }
};
