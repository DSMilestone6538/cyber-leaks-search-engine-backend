const { Client } = require('@elastic/elasticsearch');
const config = require('../config/config');
const fs = require('fs');
const CircuitBreaker = require('opossum');
const logger = require('../utils/logger');

// Read certificates from files
const caCert = fs.readFileSync(config.elasticsearch.p12.caPath);
const clientCert = fs.readFileSync(config.elasticsearch.p12.path);

// Create Elasticsearch client with SSL settings
const client = new Client({
    node: config.elasticsearch.node,
    auth: {
        username: config.elasticsearch.username,
        password: config.elasticsearch.password,
    },
    tls: {
        ca: caCert,
        cert: clientCert,
        passphrase: config.elasticsearch.p12.passphrase,
        rejectUnauthorized: true,
    }
});

// Circuit breaker options
const breakerOptions = {
    timeout: 5000, // 5 seconds timeout for the Elasticsearch request
    errorThresholdPercentage: 50, // 50% error threshold before the circuit opens
    resetTimeout: 30000, // 30 seconds before attempting to close the circuit again
};

// Create a new circuit breaker instance
const breaker = new CircuitBreaker(async (query, queryType) => {
    const response = await client.search({
        index: 'users_index', // Update this with your index name
        body: {
            query: {
                match: { [queryType]: query }, // Dynamically match the field based on queryType
            }
        }
    });

    // Log the raw Elasticsearch response for debugging
    logger.info(`Elasticsearch raw response: ${JSON.stringify(response)}`);

    // Check if response.hits exists before accessing it
    if (response.hits && response.hits.hits) {
        return response.hits.hits;
    } else {
        logger.warn('No hits found in Elasticsearch response');
        return [];
    }
}, breakerOptions);

// Fallback function if the circuit breaker opens
breaker.fallback(() => {
    logger.warn('Elasticsearch fallback triggered.');
    return { error: 'Elasticsearch service is currently unavailable. Please try again later.' };
});

// Search function utilizing the circuit breaker
exports.search = async (query, queryType) => {
    try {
        logger.info(`Starting Elasticsearch query for: ${query} with type: ${queryType}`);
        const response = await breaker.fire(query, queryType);
        logger.info(`Elasticsearch query successful for query: ${query} with type: ${queryType}`);
        return response;
    } catch (error) {
        logger.error(`Elasticsearch query failed for query: ${query} with type: ${queryType}, Error: ${error.message}`);
        return { error: 'Failed to fetch data from Elasticsearch, but the service is still running.' };
    }
};
