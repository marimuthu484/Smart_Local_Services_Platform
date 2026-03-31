import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Check if user is logged in on mount
    useEffect(() => {
        const loadUser = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const res = await api.get('/auth/me');
                setUser(res.data.user);
            } catch (err) {
                console.error('Failed to load user', err);
                logout();
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, [token]);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const register = async (userData) => {
        const res = await api.post('/auth/register', userData);
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const updateProfile = async (updates) => {
        const res = await api.put('/auth/profile', updates);
        setUser(res.data.user);
        return res.data;
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
