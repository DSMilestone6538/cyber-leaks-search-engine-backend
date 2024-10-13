const express = require('express');
const { search } = require('../controllers/searchController');
const axios = require('axios');
const logger = require('../utils/logger'); // Import the logger

const router = express.Router();

app.use(bodyParser.json());
//Update database configuration for MySQL
const db = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'cyber'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`); //Update server endpoint
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


// JWT Secret
const JWT_SECRET = 'q1q2'; // Change this to a secure key in production

// Registration Endpoint
app.post('/register', async (req, res) => {
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
app.post('/login', (req, res) => {
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
