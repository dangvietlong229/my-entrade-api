// server.js
// This Node.js Express server acts as a CORS proxy for the Entrade API.
// It allows your deployed React frontend to fetch stock data without
// encountering Cross-Origin Resource Sharing (CORS) issues directly from the browser.

const express = require('express'); // Import the Express.js framework
const cors = require('cors');       // Import the CORS middleware for Express
const fetch = require('node-fetch'); // Import node-fetch for making HTTP requests from Node.js

const app = express();
// Define the port for the server. It will use the PORT environment variable
// provided by hosting platforms (like Render, Heroku) or default to 3001 for local development.
const PORT = process.env.PORT || 3001;

// --- CORS Configuration ---
// This middleware configures CORS headers to allow requests from your deployed React app.
// It's crucial for your frontend (my-stock-order-book.web.app) to be able to communicate
// with this backend server.
app.use(cors({
    // IMPORTANT: Replace 'https://my-stock-order-book.web.app' with the actual
    // domain of your deployed React application. If you also want to allow
    // local development, you can add 'http://localhost:3000' (or your React app's local port)
    // to an array, like: ['https://my-stock-order-book.web.app', 'http://localhost:3000']
    origin: 'https://my-stock-order-book.web.app'
}));

// --- Proxy Endpoint for Entrade Stock Prices ---
// This route defines the API endpoint that your React frontend will call.
// When your frontend sends a GET request to '/api/stock-price', this server
// will then forward that request to the actual Entrade API.
app.get('/api/stock-price', async (req, res) => {
    // Extract query parameters from the frontend's request.
    // These parameters (symbol, from, to, resolution) are needed by the Entrade API.
    const { symbol, from, to, resolution } = req.query;

    // Basic validation: Ensure all required parameters are provided.
    if (!symbol || !from || !to || !resolution) {
        console.error('Missing required query parameters:', req.query);
        return res.status(400).json({
            error: 'Missing required query parameters: symbol, from, to, resolution'
        });
    }

    // Construct the full URL for the Entrade API using the received parameters.
    // This is the actual external API call that the proxy will make.
    const entradeApiUrl = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${from}&to=${to}&symbol=${symbol}&resolution=${resolution}`;

    console.log(`[Proxy] Forwarding request for ${symbol} to Entrade API: ${entradeApiUrl}`);

    try {
        // Make the HTTP request to the Entrade API.
        const response = await fetch(entradeApiUrl);

        // Check if the response from Entrade API was successful (status code 2xx).
        if (!response.ok) {
            const errorText = await response.text(); // Read the error message from Entrade
            console.error(`[Proxy] Error from Entrade API for ${symbol}: ${response.status} - ${errorText}`);
            // Forward the Entrade API's error status and message back to the frontend.
            return res.status(response.status).json({
                error: `Entrade API response for ${symbol} not OK: ${response.status} - ${errorText}`
            });
        }

        // Parse the JSON data received from the Entrade API.
        const data = await response.json();
        // Send the data received from Entrade back to your React frontend.
        res.json(data);
        console.log(`[Proxy] Successfully fetched and sent data for ${symbol}.`);

    } catch (error) {
        // Handle any network errors or other exceptions during the proxying process.
        console.error(`[Proxy] Error proxying request for ${symbol}:`, error);
        res.status(500).json({
            error: `Failed to fetch data for ${symbol} through proxy: ${error.message}`
        });
    }
});

// --- Start the Express Server ---
app.listen(PORT, () => {
    console.log(`Backend proxy server running on port ${PORT}`);
    console.log(`Access it locally at http://localhost:${PORT}`);
    console.log(`Remember to deploy this server to a public hosting service for your deployed frontend to use it.`);
});

