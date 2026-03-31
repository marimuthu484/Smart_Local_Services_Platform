const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Chat = require('../models/Chat');
const Booking = require('../models/Booking');

let io;

/**
 * Initialize Socket.io on the HTTP server.
 */
function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    /* --- Authentication middleware for sockets --- */
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        /* --- Chat Events --- */

        /**
         * Join a chat room scoped to a booking.
         */
        socket.on('join_chat', async ({ bookingId }) => {
            try {
                const booking = await Booking.findById(bookingId);
                if (!booking) return;

                const isParticipant =
                    booking.customer.toString() === socket.userId ||
                    booking.provider.toString() === socket.userId;

                if (!isParticipant) return;

                const roomName = `chat_${bookingId}`;
                socket.join(roomName);

                // Create or find the chat document
                let chat = await Chat.findOne({ booking: bookingId });
                if (!chat) {
                    chat = await Chat.create({
                        booking: bookingId,
                        participants: [booking.customer, booking.provider],
                        messages: [],
                    });
                }

                socket.emit('chat_joined', { bookingId, chatId: chat._id });
            } catch (err) {
                socket.emit('error', { message: 'Failed to join chat' });
            }
        });

        /**
         * Send a message in a booking chat room.
         */
        socket.on('send_message', async ({ bookingId, content }) => {
            try {
                const roomName = `chat_${bookingId}`;
                const message = {
                    sender: socket.userId,
                    content,
                    readBy: [socket.userId],
                    createdAt: new Date(),
                };

                // Persist to database
                await Chat.findOneAndUpdate(
                    { booking: bookingId },
                    {
                        $push: { messages: message },
                        $set: {
                            lastMessage: {
                                content,
                                sender: socket.userId,
                                timestamp: new Date(),
                            },
                        },
                    }
                );

                // Broadcast to room (including sender)
                io.to(roomName).emit('receive_message', {
                    bookingId,
                    message: { ...message, sender: { _id: socket.userId } },
                });
            } catch (err) {
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        /* --- Location Tracking Events --- */

        /**
         * Provider joins a tracking room for a booking.
         */
        socket.on('join_tracking', ({ bookingId }) => {
            const roomName = `tracking_${bookingId}`;
            socket.join(roomName);
        });

        // Throttle map tracking by saving timestamps in memory map
        const trackingThrottler = new Map();

        /**
         * Provider updates their live location.
         */
        socket.on('update_location', ({ bookingId, latitude, longitude }) => {
            const now = Date.now();
            const lastUpdate = trackingThrottler.get(socket.userId) || 0;

            if (now - lastUpdate < 5000) {
                // Ignore update if less than 5 seconds ago to prevent battery/socket drain
                return;
            }
            trackingThrottler.set(socket.userId, now);

            const roomName = `tracking_${bookingId}`;
            io.to(roomName).emit('location_updated', {
                bookingId,
                providerId: socket.userId,
                latitude,
                longitude,
                timestamp: new Date(),
            });
        });

        /* --- Cleanup --- */

        socket.on('disconnect', () => {
            // Socket.io automatically removes the socket from all rooms on disconnect
        });
    });

    return io;
}

function getIO() {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
}

module.exports = { initializeSocket, getIO };
