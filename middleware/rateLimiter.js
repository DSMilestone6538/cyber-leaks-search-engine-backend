// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis'); // Note: Destructure RedisStore
const { createClient } = require('redis');
const config = require('../config/config');
const logger = require('../utils/logger'); // Import the logger

// Create Redis client for Redis v4
const redisClient = createClient({
    url: `redis://${config.redis.host}:${config.redis.port}`,
});

// Log to verify Redis connection attempt
logger.info(`Connecting to Redis at ${config.redis.host}:${config.redis.port}`);

// Handle connection errors gracefully
redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
});

// Connect the Redis client (Redis v4 uses async connect)
(async () => {
    try {
        await redisClient.connect();
        logger.info('Connected to Redis successfully.');
    } catch (err) {
        logger.error('Failed to connect to Redis:', err);
    }
})();

module.exports = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args), // Redis v4 compatible sendCommand
    }),
    windowMs: config.rateLimit.windowMs, // Time window for rate limit
    max: config.rateLimit.maxRequests, // Maximum number of requests allowed in the window
    message: 'Too many requests from this IP, please try again after some time.',
    handler: (req, res, next) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`); // Log when rate limiting occurs
        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later.',
        });
    },
});
