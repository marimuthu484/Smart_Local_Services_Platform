import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const MyServices = () => {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State for new/edit service
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        category: 'other',
        description: '',
        priceAmount: '',
        priceUnit: 'per_hour',
        isActive: true
    });
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchMyServices();
    }, []);

    const fetchMyServices = async () => {
        try {
            const res = await api.get('/services/provider/me');
            setServices(res.data.services);
        } catch (err) {
            console.error('Failed to fetch services', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (service = null) => {
        if (service) {
            setEditingId(service._id);
            setFormData({
                title: service.title,
                category: service.category,
                description: service.description,
                priceAmount: service.price.amount,
                priceUnit: service.price.unit,
                isActive: service.isActive
            });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                category: 'other',
                description: '',
                priceAmount: '',
                priceUnit: 'per_hour',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const payload = {
                title: formData.title,
                category: formData.category,
                description: formData.description,
                price: {
                    amount: Number(formData.priceAmount),
                    unit: formData.priceUnit
                },
                isActive: formData.isActive
            };

            if (editingId) {
                await api.put(`/services/${editingId}`, payload);
            } else {
                await api.post('/services', payload);
            }

            setIsModalOpen(false);
            fetchMyServices();
        } catch (err) {
            alert(err.response?.data?.message || 'Operation failed');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this listing?')) {
            try {
                await api.delete(`/services/${id}`);
                setServices(services.filter(s => s._id !== id));
            } catch (err) {
                alert('Failed to delete service');
            }
        }
    };

    if (loading) return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">My Listings</h1>
                    <p className="mt-1 text-slate-400">Manage your offered services and pricing</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
                    <PlusIcon className="h-5 w-5" /> Add New Service
                </button>
            </div>

            {services.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
                    <div className="mb-4 rounded-full bg-slate-800 p-4">
                        <CheckCircleIcon className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">No active listings</h3>
                    <p className="mt-2 text-slate-400">Create your first service listing to start receiving bookings.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                        <div key={service._id} className={`glass-card p-6 transition-all ${!service.isActive && 'opacity-60'}`}>
                            <div className="mb-3 flex items-start justify-between">
                                <span className={`badge ${service.isActive ? 'badge-accepted' : 'badge-cancelled'}`}>
                                    {service.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{service.category.replace('-', ' ')}</span>
                            </div>

                            <h3 className="mb-2 text-xl font-bold text-white line-clamp-1">{service.title}</h3>
                            <p className="mb-4 text-sm text-slate-400 line-clamp-2">{service.description}</p>

                            <div className="mb-6 flex items-end gap-1 border-t border-slate-700/50 pt-4">
                                <span className="text-2xl font-bold text-white">${service.price.amount}</span>
                                <span className="text-sm text-slate-400 mb-1">/ {service.price.unit.split('_')[1]}</span>
                            </div>

                            <div className="flex gap-2 border-t border-slate-700/50 pt-4">
                                <Link to={`/service/${service._id}`} className="flex-1 btn-secondary text-center py-2 text-sm">Preview</Link>
                                <button onClick={() => handleOpenModal(service)} className="flex items-center justify-center rounded-lg bg-indigo-500/10 p-2 text-indigo-400 transition hover:bg-indigo-500/20">
                                    <PencilIcon className="h-5 w-5" />
                                </button>
                                <button onClick={() => handleDelete(service._id)} className="flex items-center justify-center rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20">
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="glass-card animate-scale-in w-full max-w-2xl overflow-hidden bg-slate-900 border border-slate-700 max-h-[90vh] flex flex-col">
                        <div className="border-b border-slate-800 p-6 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white">{editingId ? 'Edit Listing' : 'Create Listing'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-300">Service Title</label>
                                <input required type="text" className="input-field" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Professional House Cleaning" />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-300">Category</label>
                                <select required className="input-field bg-slate-800" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option value="plumbing">Plumbing</option>
                                    <option value="electrical">Electrical</option>
                                    <option value="cleaning">Cleaning</option>
                                    <option value="painting">Painting</option>
                                    <option value="carpentry">Carpentry</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-300">Description</label>
                                <textarea required rows="4" className="input-field resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe what is included in your service..."></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-300">Price Amount ($)</label>
                                    <input required type="number" min="0" step="0.01" className="input-field" value={formData.priceAmount} onChange={e => setFormData({ ...formData, priceAmount: e.target.value })} placeholder="50.00" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-300">Price Unit</label>
                                    <select required className="input-field bg-slate-800" value={formData.priceUnit} onChange={e => setFormData({ ...formData, priceUnit: e.target.value })}>
                                        <option value="per_hour">Per Hour</option>
                                        <option value="per_visit">Per Visit</option>
                                        <option value="per_project">Per Project</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/50" />
                                <label htmlFor="isActive" className="text-sm font-medium text-slate-300">Listing is active and visible to customers</label>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-800 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1 py-3">Cancel</button>
                                <button type="submit" disabled={formLoading} className="btn-primary flex-1 py-3">{formLoading ? 'Saving...' : 'Save Listing'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyServices;
