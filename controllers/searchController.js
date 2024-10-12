const elasticService = require('../services/elasticService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger'); // Import the logger

// Allowed query types
const allowedQueryTypes = ['email', 'username', 'password', 'address', 'phone', 'ip'];

// Handles search queries
exports.search = async (req, res, next) => {
    const { query, queryType } = req.query;

    // Validate the query and queryType parameters
    if (!query || !queryType) {
        logger.warn('Missing query or queryType in request');
        return res.status(400).json({ success: false, message: 'Both query and queryType are required' });
    }

    // Validate queryType is one of the allowed values
    if (!allowedQueryTypes.includes(queryType)) {
        logger.warn(`Invalid queryType: ${queryType}`);
        return res.status(400).json({ success: false, message: `Invalid queryType: ${queryType}. Allowed types are: ${allowedQueryTypes.join(', ')}` });
    }

    logger.info(`Received search query: ${query} for type: ${queryType}`); // Log the search query and type

    try {
        // Check if query is cached
        const cachedResult = cacheService.getCache(`${query}-${queryType}`);
        if (cachedResult) {
            logger.info(`Cache hit for query: ${query} and type: ${queryType}`); // Log cache hit
            return res.status(200).json({ success: true, results: cachedResult, cached: true });
        }

        logger.info(`Cache miss for query: ${query} and type: ${queryType}. Fetching from Elasticsearch.`); // Log cache miss

        // Fetch results from Elasticsearch based on queryType
        const results = await elasticService.search(query, queryType);

        // Cache the result
        cacheService.setCache(`${query}-${queryType}`, results);
        logger.info(`Results cached for query: ${query} and type: ${queryType}`); // Log that the results were cached

        return res.status(200).json({ success: true, results, cached: false });
    } catch (error) {
        logger.error(`Error processing search for query: ${query} and type: ${queryType}, Error: ${error.message}`); // Log the error
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
