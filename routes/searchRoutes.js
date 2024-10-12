const express = require('express');
const { search } = require('../controllers/searchController');
const axios = require('axios');
const logger = require('../utils/logger'); // Import the logger

const router = express.Router();

router.get('/search', (req, res, next) => {
    // Log the full URL of the request
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    logger.info(`Full API request URL: ${fullUrl}`);

    // Also log the query and queryType
    logger.info(`Search route accessed with query: ${req.query.query} and queryType: ${req.query.queryType}`);

    // Call the search controller
    search(req, res, next);
});

// New route to make request to external API
router.get('/osint-search', async (req, res, next) => {
    try {
        const { query, type } = req.query; // Extract both query and type from request parameters

        // Validate the presence of both query and type
        if (!query || !type) {
            return res.status(400).json({ error: 'Both query and type parameters are required' });
        }

        // Validate that type is one of email, phone, or username
        const validTypes = ['email', 'phone', 'username'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `Invalid type parameter. Allowed values are: ${validTypes.join(', ')}` });
        }

        // Log the query and type parameters
        logger.info(`Fetching Osint API with query: ${query} and type: ${type}`);

        const url = `https://api.osint.industries/v2/request?type=${encodeURIComponent(type)}&query=${encodeURIComponent(query)}&timeout=150`;

        // Make request to the external API using axios
        const response = await axios.get(url, {
            headers: {
                'api-key': '4a549bcd0f2d663f62010bcf587bfe4c',
                'accept': 'application/json'
            }
        });

        // Log successful response
        logger.info(`Received response from Osint API for query: ${query} and type: ${type}`);

        // Send back the response from the external API to the client
        res.json(response.data);
    } catch (error) {
        logger.error(`Error fetching data from Osint API: ${error.message}`);
        res.status(500).json({ error: 'An error occurred while fetching data from Osint API' });
    }
});

module.exports = router;
