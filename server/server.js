require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initializeSocket } = require('./sockets');
const seedAdmin = require('./utils/seedAdmin');

const PORT = process.env.PORT || 5000;

/* Create HTTP server (needed for Socket.io) */
const server = http.createServer(app);

/* Initialize Socket.io */
initializeSocket(server);

/* Connect to MongoDB & Seed Admin */
connectDB().then(async () => {
    // Attempt Admin population
    await seedAdmin();

    server.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
});

/* Graceful shutdown */
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});
