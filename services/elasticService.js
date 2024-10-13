const { Client } = require('@elastic/elasticsearch');
const config = require('../config/config');
const fs = require('fs');
const CircuitBreaker = require('opossum');
const logger = require('../utils/logger');

// Read the CA certificate from the file system
const caCert = fs.readFileSync(config.elasticsearch.pem.caPath);

// Create Elasticsearch client with SSL settings
const client = new Client({
    node: config.elasticsearch.node,
    auth: {
        username: config.elasticsearch.username,
        password: config.elasticsearch.password,
    },
    tls: {
        ca: caCert,  // Pass the CA certificate here
        rejectUnauthorized: true,  // Ensure the certificate is validated
    }
});

// Circuit breaker options
const breakerOptions = {
    timeout: 5000,  // 5 seconds timeout for the Elasticsearch request
    errorThresholdPercentage: 50,  // 50% error threshold before the circuit opens
    resetTimeout: 30000,  // 30 seconds before attempting to close the circuit again
};

// Create a new circuit breaker instance
const breaker = new CircuitBreaker(async (query, queryType) => {
    let type;
    if (queryType === "username" || queryType === "ip") {
        type = "sec-csv-people-2024.10.07,sec-csv-address-2024.10.07"
    } else if (queryType === "email") {
        type = "sec-csv-people-2024.10.07"
    } else if (queryType === "address") {
        type = "sec-csv-address-2024.10.07";
    } else {
        type = "sec-csv-people-2024.10.07,sec-csv-address-2024.10.07,sec-mysql-telegram_online_gathering1-2024.10.07";
    }

    const response = await client.search({

        index: type,
        body: {
            query: {
                multi_match: {
                    query: query,
                    fields: ['*'],
                    type: 'best_fields',
                    fuzziness: 'AUTO'
                }
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
        logger.error(`Elasticsearch query failed for query: ${query} with type: ${queryType}, Full error: ${JSON.stringify(error)}`);
        return { error: 'Failed to fetch data from Elasticsearch, but the service is still running.' };
    }
};
