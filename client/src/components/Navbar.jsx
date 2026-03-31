import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bars3Icon, XMarkIcon, BellIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsOpen(false);
    };

    return (
        <nav className="glass-card sticky top-0 z-50 rounded-none border-x-0 border-t-0 bg-opacity-80 px-4 py-3 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-lg">
                        S
                    </div>
                    <span className="hidden text-xl font-bold tracking-tight text-white sm:block">
                        Smart<span className="gradient-text">Local</span>
                    </span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden items-center gap-6 md:flex">
                    {user ? (
                        <>
                            <Link to="/search" className="text-sm font-medium text-slate-300 transition hover:text-white">Services</Link>
                            <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="text-sm font-medium text-slate-300 transition hover:text-white">
                                {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                            </Link>
                            {user.role === 'customer' && (
                                <Link to="/bookings" className="text-sm font-medium text-slate-300 transition hover:text-white">My Bookings</Link>
                            )}
                            {user.role === 'provider' && (
                                <>
                                    <Link to="/bookings" className="text-sm font-medium text-slate-300 transition hover:text-white">Bookings</Link>
                                    <Link to="/my-services" className="text-sm font-medium text-slate-300 transition hover:text-white">My Listings</Link>
                                    <Link to="/provider-payments" className="text-sm font-medium text-slate-300 transition hover:text-white">My Payments</Link>
                                </>
                            )}

                            <Link to="/notifications" className="relative text-slate-300 transition hover:text-white p-1">
                                <BellIcon className="h-6 w-6" />
                            </Link>

                            <div className="h-6 w-px bg-slate-700"></div>

                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-indigo-300">
                                    {user.name.split(' ')[0]}
                                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                        user.role === 'provider' ? 'bg-pink-500/20 text-pink-400' :
                                            'bg-indigo-500/20 text-indigo-400'
                                        }`}>
                                        {user.role}
                                    </span>
                                </span>
                                <button onClick={handleLogout} className="btn-secondary py-1.5 text-sm">Logout</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/search" className="text-sm font-medium text-slate-300 transition hover:text-white">Browse Services</Link>
                            <Link to="/login" className="text-sm font-medium text-slate-300 transition hover:text-white">Login</Link>
                            <Link to="/" className="btn-primary py-1.5 text-sm">Get Started</Link>
                        </>
                    )}
                </div>

                {/* Mobile menu button */}
                <div className="flex md:hidden">
                    <button onClick={() => setIsOpen(!isOpen)} className="text-slate-300 hover:text-white">
                        {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="animate-fade-in mt-4 flex flex-col gap-4 rounded-xl bg-slate-800/90 p-4 md:hidden">
                    {user ? (
                        <>
                            <Link to="/search" onClick={() => setIsOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white">Services</Link>
                            <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} onClick={() => setIsOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white">
                                {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                            </Link>
                            <Link to="/bookings" onClick={() => setIsOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white">Bookings</Link>
                            {user.role === 'provider' && (
                                <Link to="/provider-payments" onClick={() => setIsOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white">My Payments</Link>
                            )}
                            <Link to="/notifications" onClick={() => setIsOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white">Notifications</Link>
                            <button onClick={handleLogout} className="btn-secondary w-full text-center">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/search" onClick={() => setIsOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white">Browse Services</Link>
                            <Link to="/login" onClick={() => setIsOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white">Login</Link>
                            <Link to="/" onClick={() => setIsOpen(false)} className="btn-primary w-full text-center">Get Started</Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
