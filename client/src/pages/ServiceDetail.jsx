import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { StarIcon, MapPinIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

const ServiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Booking state
    const [date, setDate] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [notes, setNotes] = useState('');
    const [address, setAddress] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    useEffect(() => {
        const fetchService = async () => {
            try {
                const res = await api.get(`/services/${id}`);
                setService(res.data.service);

                // Initialize address if user is logged in
                if (user && user.location?.address) {
                    setAddress(user.location.address);
                }
            } catch (err) {
                setError('Service not found');
            } finally {
                setLoading(false);
            }
        };
        fetchService();
    }, [id, user]);

    useEffect(() => {
        if (date && service) {
            const fetchAvailability = async () => {
                try {
                    const res = await api.get(`/bookings/availability/${id}?date=${date}`);
                    setAvailableSlots(res.data.slots);
                    setSelectedSlot(null); // Reset selection on date change
                } catch (err) {
                    console.error('Failed to fetch slots', err);
                }
            };
            fetchAvailability();
        }
    }, [date, id, service]);

    const handleBook = async (e) => {
        e.preventDefault();
        if (!user) {
            navigate('/login', { state: { from: `/service/${id}` } });
            return;
        }

        if (user.role === 'provider') {
            alert('Only customers can book services.');
            return;
        }

        if (!date || !selectedSlot) {
            alert('Please select a date and time slot.');
            return;
        }

        setBookingLoading(true);
        try {
            await api.post('/bookings', {
                service: id,
                date,
                timeSlot: selectedSlot,
                notes,
                customerAddress: address
            });
            setBookingSuccess(true);
            window.scrollTo(0, 0);
        } catch (err) {
            alert(err.response?.data?.message || 'Booking failed');
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
    );

    if (error || !service) return (
        <div className="flex justify-center py-20 text-center">
            <h2 className="text-2xl font-bold text-red-400">{error || 'Service not found'}</h2>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {bookingSuccess ? (
                <div className="glass-card animate-scale-in mx-auto max-w-2xl p-12 text-center">
                    <div className="mb-6 flex justify-center">
                        <CheckCircleIcon className="h-24 w-24 text-green-500" />
                    </div>
                    <h2 className="mb-4 text-3xl font-bold text-white">Booking Confirmed!</h2>
                    <p className="mb-8 text-lg text-slate-300">
                        Your request has been sent to {service.provider.name}. You will be notified once they accept it.
                    </p>
                    <button onClick={() => navigate('/bookings')} className="btn-primary">
                        View My Bookings
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

                    {/* Main Content: Service Details */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="glass-card overflow-hidden">
                            {/* Cover Image */}
                            <div className="relative h-64 w-full bg-slate-800 sm:h-80">
                                {service.images?.length > 0 ? (
                                    <img src={service.images[0]} alt={service.title} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
                                        <span className="text-6xl font-bold text-white/20">{service.title.charAt(0)}</span>
                                    </div>
                                )}
                                <div className="absolute left-6 top-6 rounded-full bg-slate-900/80 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                                    {service.category.replace('-', ' ')}
                                </div>
                            </div>

                            {/* Service Info */}
                            <div className="p-6 sm:p-8">
                                <div className="mb-4 flex items-center justify-between">
                                    <h1 className="text-3xl font-bold text-white">{service.title}</h1>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-indigo-400">${service.price.amount}</div>
                                        <div className="text-sm text-slate-400">/ {service.price.unit.split('_')[1]}</div>
                                    </div>
                                </div>

                                <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                                    <div className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1">
                                        <StarIcon className="h-4 w-4 text-amber-400" />
                                        <span className="font-bold text-white">{service.rating > 0 ? service.rating : 'New'}</span>
                                        <span>({service.totalReviews} reviews)</span>
                                    </div>
                                    <div className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1">
                                        <MapPinIcon className="h-4 w-4 text-indigo-400" />
                                        <span>{service.location?.city || 'Local area'}</span>
                                    </div>
                                </div>

                                <h3 className="mb-3 text-xl font-semibold text-white">About This Service</h3>
                                <p className="whitespace-pre-line text-slate-300 leading-relaxed">
                                    {service.description}
                                </p>

                                <hr className="my-8 border-slate-700/50" />

                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-indigo-600 font-bold text-white text-xl">
                                        {service.provider.avatar ? (
                                            <img src={service.provider.avatar} alt={service.provider.name} className="h-full w-full object-cover" />
                                        ) : (
                                            service.provider.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-white">Provider: {service.provider.name}</h4>
                                        <p className="text-slate-400">{service.provider.bio || 'Professional Service Provider'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Booking Form */}
                    <div className="lg:col-span-1">
                        <div className="glass-card sticky top-24 p-6">
                            <h3 className="mb-6 text-xl font-bold text-white">Book This Service</h3>

                            <form onSubmit={handleBook} className="space-y-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-300">Select Date</label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        className="input-field"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>

                                {date && (
                                    <div className="animate-fade-in">
                                        <label className="mb-2 block text-sm font-medium text-slate-300">Available Time Slots</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {availableSlots.length > 0 ? (
                                                availableSlots.map((slot, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        disabled={!slot.available}
                                                        onClick={() => setSelectedSlot(slot)}
                                                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${!slot.available
                                                                ? 'border-red-900/30 bg-red-900/10 text-red-400/50 cursor-not-allowed line-through'
                                                                : selectedSlot?.start === slot.start
                                                                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                                                                    : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-indigo-500/50'
                                                            }`}
                                                    >
                                                        {slot.start} - {slot.end}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="col-span-2 text-center text-sm text-slate-400 py-2">
                                                    No slots available on this date.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-300">Service Address</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="123 Main St, City"
                                        className="input-field"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-300">Special Requests / Notes</label>
                                    <textarea
                                        rows="3"
                                        className="input-field resize-none"
                                        placeholder="Any specific instructions for the provider..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                </div>

                                <div className="rounded-lg bg-slate-800/80 p-4">
                                    <div className="flex justify-between text-sm mb-2 text-slate-300">
                                        <span>Service Fee</span>
                                        <span>${service.price.amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2 text-slate-300">
                                        <span>Tax & Platform Fee</span>
                                        <span>${(service.price.amount * 0.1).toFixed(2)}</span>
                                    </div>
                                    <div className="mt-4 flex justify-between border-t border-slate-700 pt-3 text-lg font-bold text-white">
                                        <span>Total Due Later</span>
                                        <span className="text-indigo-400">${(service.price.amount * 1.1).toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={bookingLoading || !selectedSlot}
                                    className={`btn-primary w-full py-3 ${(!selectedSlot) && 'opacity-50 cursor-not-allowed border-slate-700'}`}
                                >
                                    {bookingLoading ? 'Processing...' : user ? 'Confirm Booking Request' : 'Login to Book'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceDetail;
