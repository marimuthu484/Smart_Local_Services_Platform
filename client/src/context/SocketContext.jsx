import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { token, user } = useAuth();

    useEffect(() => {
        // Only connect socket if we have a token (user is logged in)
        if (token && user) {
            const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
                auth: { token },
            });

            newSocket.on('connect', () => {
                console.log('Socket connected:', newSocket.id);
            });

            newSocket.on('connect_error', (err) => {
                console.error('Socket connection error:', err.message);
            });

            setSocket(newSocket);

            // Cleanup on unmount or token change
            return () => {
                newSocket.disconnect();
            };
        } else if (socket) {
            // If logged out but socket exists, disconnect
            socket.disconnect();
            setSocket(null);
        }
    }, [token, user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
