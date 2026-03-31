import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MagnifyingGlassIcon, MapPinIcon, StarIcon, FireIcon } from '@heroicons/react/24/solid';

const Search = () => {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('');
    const [useLocation, setUseLocation] = useState(false);

    const categories = [
        'plumbing', 'electrical', 'cleaning', 'painting', 'carpentry',
        'appliance-repair', 'pest-control', 'gardening', 'tutoring',
        'beauty', 'fitness', 'photography', 'catering', 'moving', 'other'
    ];

    const fetchServices = async () => {
        setLoading(true);
        try {
            let query = `/services?`;
            if (searchTerm) query += `search=${searchTerm}&`;
            if (category) query += `category=${category}&`;

            // Trigger geospatial native filtering if enabled and location data is valid
            if (useLocation && user?.location?.coordinates) {
                query += `lng=${user.location.coordinates[0]}&lat=${user.location.coordinates[1]}&radius=50&`;
            }

            const res = await api.get(query);
            setServices(res.data.services);
        } catch (err) {
            console.error('Failed to fetch services', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, [category, useLocation]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchServices();
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Hero Search Section */}
            <div className="animate-slide-in mb-12 text-center">
                <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    Find Trusted <span className="gradient-text">Local Pros</span>
                </h1>
                <p className="mb-8 text-lg text-slate-400">
                    Book top-rated service providers in your area instantly.
                </p>

                <form onSubmit={handleSearch} className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="What service do you need?"
                            className="input-field pl-12 py-3.5 text-lg shadow-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="input-field w-full sm:w-48 py-3.5 shadow-lg bg-slate-800"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}
                            </option>
                        ))}
                    </select>
                    <button type="submit" className="btn-primary py-3.5 px-8 text-lg shadow-lg">
                        Search
                    </button>
                </form>

                {/* Geo-Filter Toggle */}
                {user?.location?.coordinates && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <button
                            onClick={() => setUseLocation(!useLocation)}
                            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${useLocation ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            <MapPinIcon className="h-5 w-5" />
                            {useLocation ? 'Finding Nearest Services (50km)' : 'Find Services Near Me'}
                        </button>
                    </div>
                )}
            </div>

            {/* Results Section */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                </div>
            ) : services.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
                    <div className="mb-4 rounded-full bg-slate-800 p-4">
                        <MagnifyingGlassIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">No services found</h3>
                    <p className="mt-2 text-slate-400">Try adjusting your search criteria or category filter.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {services.map((service, index) => (
                        <div
                            key={service._id}
                            className="glass-card animate-fade-in group flex h-full flex-col overflow-hidden"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Image placeholder with gradient fallback */}
                            <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                                {service.images && service.images[0] ? (
                                    <img
                                        src={service.images[0]}
                                        alt={service.title}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
                                        <span className="text-4xl font-bold text-white/20">{service.title.charAt(0)}</span>
                                    </div>
                                )}
                                <div className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                                    {service.category.charAt(0).toUpperCase() + service.category.slice(1).replace('-', ' ')}
                                </div>
                            </div>

                            <div className="flex flex-1 flex-col p-5">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <h3 className="line-clamp-2 text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                        {service.title}
                                    </h3>
                                    <div className="flex flex-shrink-0 items-center rounded bg-amber-500/20 px-2 py-1 text-amber-400">
                                        <StarIcon className="mr-1 h-3.5 w-3.5" />
                                        <span className="text-xs font-bold">{service.rating > 0 ? service.rating : 'New'}</span>
                                    </div>
                                </div>

                                <p className="mb-4 line-clamp-2 flex-1 text-sm text-slate-400">
                                    {service.description}
                                </p>

                                <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
                                    <MapPinIcon className="h-4 w-4 text-indigo-400" />
                                    <span className="truncate">{service.location?.city || 'Remote / Local'}</span>
                                    {service.calculatedDistance && (
                                        <span className="ml-auto flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-0.5 text-indigo-300">
                                            <FireIcon className="h-3 w-3" />
                                            {(service.calculatedDistance / 1000).toFixed(1)} km away
                                        </span>
                                    )}
                                </div>

                                <div className="mt-auto flex items-center justify-between border-t border-slate-700/50 pt-4">
                                    <div>
                                        <span className="text-xl font-bold text-white">${service.price.amount}</span>
                                        <span className="text-xs text-slate-400"> / {service.price.unit.split('_')[1]}</span>
                                    </div>
                                    <Link
                                        to={`/service/${service._id}`}
                                        className="btn-primary py-1.5 px-4 text-sm"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Search;
