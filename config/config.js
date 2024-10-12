require('dotenv').config();
const fs = require('fs');
const path = require('path');

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development'
    },
    elasticsearch: {
        node: process.env.ELASTICSEARCH_URL || 'https://localhost:9200',
        username: process.env.ES_USERNAME || 'your-username',
        password: process.env.ES_PASSWORD || 'your-password',
        p12: {
            path: path.resolve(__dirname, './certs/http.p12'), // Path to the http.p12 file
            passphrase: process.env.ES_P12_PASSPHRASE || '', // Passphrase for the p12 file (if any)
            caPath: path.resolve(__dirname, './certs/elastic-stack-ca.p12'), // Path to the ca.p12 file
            caPassphrase: process.env.ES_CA_PASSPHRASE || '', // Passphrase for the CA p12 file (if any)
        },
        pem: {
            caPath: path.resolve(__dirname, './certs/elasticsearch-ca.pem'),
        }
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
    },
    redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
    },
};

// Log to verify the Redis configuration
console.log(`Redis configuration: host=${module.exports.redis.host}, port=${module.exports.redis.port}`);
