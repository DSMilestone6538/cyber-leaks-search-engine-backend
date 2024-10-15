const express = require('express');
const { search } = require('../controllers/searchController');
const axios = require('axios');
const logger = require('../utils/logger');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Client } = require('@elastic/elasticsearch');

const router = express.Router();

// Initialize Elasticsearch client
const esClient = new Client({
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

//Update database configuration for MySQL
const db = mysql.createConnection({
    host: '167.235.238.249',
    port: 3306,
    user: 'root',
    password: 's3lWbRIc6Owl9am',
    database: 'security_data'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

router.get('/search', (req, res, next) => {
    // Log the full URL of the request
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    logger.info(`Full API request URL: ${fullUrl}`);

    // Also log the query and queryType
    logger.info(`Search route accessed with query: ${req.query.query} and queryType: ${req.query.queryType}`);

    // Call the search controller
    search(req, res, next);
});

//make request to external API or retrieve from Elasticsearch if exists
router.get('/osint-search', async (req, res, next) => {
    try {
        const { query, type } = req.query;

        // Validate input
        if (!query || !type) {
            return res.status(400).json({ error: 'Both query and type parameters are required' });
        }

        // Validate query type
        const validTypes = ['email', 'phone', 'username'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `Invalid type parameter. Allowed values are: ${validTypes.join(', ')}` });
        }

        // Log the query and type
        logger.info(`Checking Elasticsearch for query: ${query} and type: ${type}`);

        // Search Elasticsearch for an existing document
        const esSearchResult = await esClient.search({
            index: 'osint-search-results', // Elasticsearch index name
            body: {
                query: {
                    bool: {
                        must: [
                            { match: { query: query } },
                            { match: { type: type } }
                        ]
                    }
                }
            }
        });

        // Check if any hits were returned from Elasticsearch
        if (esSearchResult.body.hits.total.value > 0) {
            logger.info(`Found matching document in Elasticsearch for query: ${query} and type: ${type}`);

            // Return the data directly from Elasticsearch
            const esDocument = esSearchResult.body.hits.hits[0]._source;
            return res.json(esDocument.response);
        }

        // If no match is found in Elasticsearch, proceed to request from the external API
        logger.info(`No matching document found in Elasticsearch. Fetching from Osint API...`);

        const url = `https://api.osint.industries/v2/request?type=${encodeURIComponent(type)}&query=${encodeURIComponent(query)}&timeout=150`;
        const apiResponse = await axios.get(url, {
            headers: {
                'api-key': '4a549bcd0f2d663f62010bcf587bfe4c',
                'accept': 'application/json'
            }
        });

        logger.info(`Received response from Osint API for query: ${query} and type: ${type}`);

        // Prepare the Elasticsearch document with query, type, and response array
        const esDocument = {
            query: query,
            type: type,
            response: apiResponse.data, // Store the entire response array
            timestamp: new Date().toISOString() // Optional timestamp
        };

        // Index the document into Elasticsearch
        const esResponse = await esClient.index({
            index: 'osint-search-results',
            body: esDocument
        });

        logger.info(`Indexed new data into Elasticsearch with ID: ${esResponse.body._id}`);

        // Return the original API response to the client
        res.json(apiResponse.data);

    } catch (error) {
        logger.error(`Error processing request: ${error.message}`);
        res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
});


// JWT Secret
const JWT_SECRET = 'q1q2'; // Change this to a secure key in production

// Registration Endpoint
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        db.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) {
                const obj = {
                    type: "$register",
                    status: "error",
                    message: "User registration failed.",
                    body: {
                        username,
                        email
                    }

                }
                return res.status(500).json(obj);
            }
            const obj = {
                type: "$register",
                status: "success",
                message: "User registered successfully.",
                body: {
                    username,
                    email
                }

            }
            res.status(201).json(obj);
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// Login Endpoint
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err || results.length === 0) {
            const obj = {
                type: "$login",
                status: "error",
                message: "Invalid username or password.11",
                body: {
                    username
                }

            }
            return res.status(4012).json(obj);
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const obj = {
                type: "$login",
                status: "error",
                message: "Invalid username or password.",
                body: {
                    username
                }

            }
            return res.status(401).json(obj);
        }

        // Generate JWT Token
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        const obj = {
            type: "$login",
            status: "success",
            message: "Login Success",
            body: {
                username,
                token
            }

        }
        res.json(obj);
    });
});

module.exports = router;
