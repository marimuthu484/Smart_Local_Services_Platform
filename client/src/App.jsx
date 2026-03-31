import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import ServiceDetail from './pages/ServiceDetail';
import Bookings from './pages/Bookings';
import Chat from './pages/Chat';
import Tracking from './pages/Tracking';
import Dashboard from './pages/Dashboard';
import MyServices from './pages/MyServices';
import Admin from './pages/Admin';
import ReviewCreate from './pages/ReviewCreate';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProviderVerification from './pages/ProviderVerification';
import Notifications from './pages/Notifications';
import Payment from './pages/Payment';
import ProviderPayments from './pages/ProviderPayments';

const App = () => {
    return (
        <AuthProvider>
            <SocketProvider>
                <BrowserRouter>
                    <div className="flex min-h-screen flex-col">
                        <Navbar />

                        <main className="flex-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-[#1e1b4b]">
                            <Routes>
                                {/* Public Routes */}
                                <Route path="/" element={<Home />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/search" element={<Search />} />
                                <Route path="/service/:id" element={<ServiceDetail />} />
                                <Route path="/forgot-password" element={<ForgotPassword />} />
                                <Route path="/reset-password/:resettoken" element={<ResetPassword />} />

                                {/* Protected Routes */}
                                <Route element={<ProtectedRoute />}>
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/bookings" element={<Bookings />} />
                                    <Route path="/my-services" element={<MyServices />} />
                                    <Route path="/admin" element={<Admin />} />
                                    <Route path="/review/:bookingId" element={<ReviewCreate />} />
                                    <Route path="/chat/:bookingId" element={<Chat />} />
                                    <Route path="/tracking/:bookingId" element={<Tracking />} />
                                    <Route path="/verify-provider" element={<ProviderVerification />} />
                                    <Route path="/notifications" element={<Notifications />} />
                                    <Route path="/payment/:bookingId" element={<Payment />} />
                                    <Route path="/provider-payments" element={<ProviderPayments />} />
                                </Route>
                            </Routes>
                        </main>
                    </div>
                </BrowserRouter>
            </SocketProvider>
        </AuthProvider>
    );
};

export default App;
