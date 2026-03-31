import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
});

// Custom Provider Icon (purple)
const providerIcon = new L.Icon({
    ...L.Icon.Default.prototype.options,
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
});

// Component to dynamically update map center
const ChangeView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] !== 0) {
            map.setView(center, 15);
        }
    }, [center, map]);
    return null;
};

const Tracking = () => {
    const { bookingId } = useParams();
    const { user } = useAuth();
    const { socket } = useSocket();
    const [booking, setBooking] = useState(null);
    const [providerLocation, setProviderLocation] = useState([0, 0]); // [lat, lng]
    const [loading, setLoading] = useState(true);
    const [isTracking, setIsTracking] = useState(false);
    const [watchId, setWatchId] = useState(null);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const res = await api.get(`/bookings/${bookingId}`);
                setBooking(res.data.booking);
                // Default location mock near San Francisco if backend coords are 0,0
                setProviderLocation([37.7749, -122.4194]);
            } catch (err) {
                console.error('Failed to fetch booking', err);
            } finally {
                setLoading(false);
            }
        };
        fetchBooking();
    }, [bookingId]);

    useEffect(() => {
        if (!socket || !bookingId) return;

        socket.emit('join_tracking', { bookingId });

        const handleLocationUpdate = (data) => {
            if (user.role === 'customer') {
                setProviderLocation([data.latitude, data.longitude]);
            }
        };

        socket.on('location_updated', handleLocationUpdate);
        return () => socket.off('location_updated', handleLocationUpdate);
    }, [socket, bookingId, user]);

    // Provider: Start broadcasting location
    const toggleTracking = () => {
        if (isTracking) {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            setIsTracking(false);
            setWatchId(null);
        } else {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser');
                return;
            }

            const id = navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setProviderLocation([lat, lng]);
                    socket.emit('update_location', {
                        bookingId,
                        latitude: lat,
                        longitude: lng,
                    });
                },
                (error) => alert('Error getting location: ' + error.message),
                { enableHighAccuracy: true, maximumAge: 0 }
            );
            setWatchId(id);
            setIsTracking(true);
        }
    };

    if (loading) return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
    );

    if (!booking) return <div className="p-8 text-center text-white">Booking not found.</div>;

    return (
        <div className="mx-auto flex h-[calc(100vh-64px)] max-w-7xl flex-col p-4 sm:p-6 lg:p-8">
            <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white">Live Tracking</h1>
                    <p className="mt-1 text-slate-400">
                        Booking: {booking.service?.title} | Status: <span className="font-bold text-indigo-400 uppercase text-xs">{booking.status}</span>
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Link to={`/chat/${bookingId}`} className="btn-secondary whitespace-nowrap">
                        Open Chat
                    </Link>
                    {user.role === 'provider' && (
                        <button
                            onClick={toggleTracking}
                            className={`whitespace-nowrap rounded-lg px-6 py-2.5 font-bold shadow-lg transition ${isTracking ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' : 'btn-primary'
                                }`}
                        >
                            {isTracking ? 'Stop Broadcasting Location' : 'Start Broadcasting Location'}
                        </button>
                    )}
                </div>
            </div>

            <div className="glass-card flex-1 overflow-hidden relative">
                {/* Connection Overlay for UI */}
                {(user.role === 'customer' && providerLocation[0] === 37.7749) && (
                    <div className="absolute top-4 right-4 z-[400] rounded-lg bg-yellow-500/20 px-4 py-2 text-sm text-yellow-500 backdrop-blur-md border border-yellow-500/30">
                        Waiting for provider to share location...
                    </div>
                )}

                <MapContainer
                    center={providerLocation}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ChangeView center={providerLocation} />

                    <Marker position={providerLocation} icon={providerIcon}>
                        <Popup className="font-semibold">
                            {user.role === 'provider' ? 'Your Current Location' : `${booking.provider.name}'s Location`}
                        </Popup>
                    </Marker>

                    {/* If customer, show destination (mocked near SF for demo if real coordinates aren't set) */}
                    {user.role === 'provider' && (
                        <Marker position={[37.7600, -122.4200]}>
                            <Popup>Customer Location: {booking.customerAddress}</Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default Tracking;
