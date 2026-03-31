import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../services/api';

// Fix Leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });
    return position === null ? null : <Marker position={position} />;
};

const WORK_CATEGORIES = [
    'plumbing', 'electrical', 'cleaning', 'carpentry', 'painting',
    'gardening', 'tutoring', 'fitness', 'beauty', 'photography',
    'cooking', 'moving', 'repair', 'other'
];

const Register = () => {
    const [searchParams] = useSearchParams();
    const preselectedRole = searchParams.get('role') || 'customer';
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: preselectedRole === 'provider' ? 'provider' : 'customer',
        phone: '',
        address: '',
        dateOfBirth: '',
        educationQualification: '',
        workCategory: '',
        workDetails: '',
        workExperience: '',
    });
    const [documents, setDocuments] = useState([]);
    const [position, setPosition] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(f => f.type === 'application/pdf' && f.size <= 5 * 1024 * 1024);
        if (validFiles.length !== files.length) {
            setError('Only PDF files under 5MB are accepted.');
        } else {
            setError('');
        }
        setDocuments(validFiles);
    };

    const validateStep1 = () => {
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('All fields are required');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }
        setError('');
        return true;
    };

    const validateStep2 = () => {
        if (!formData.phone || !formData.dateOfBirth || !formData.educationQualification ||
            !formData.workCategory || !formData.workDetails || !formData.workExperience) {
            setError('All professional fields are required for provider registration');
            return false;
        }
        setError('');
        return true;
    };

    const handleNext = () => {
        if (validateStep1()) setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!position) {
            return setError('Please select your location on the map');
        }

        const isProvider = formData.role === 'provider';

        if (isProvider && !validateStep2()) return;

        setIsLoading(true);

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                phone: formData.phone,
                location: {
                    type: 'Point',
                    coordinates: [position[1], position[0]],
                    address: formData.address || 'User Location',
                }
            };

            if (isProvider) {
                payload.dateOfBirth = formData.dateOfBirth;
                payload.educationQualification = formData.educationQualification;
                payload.workCategory = formData.workCategory;
                payload.workDetails = formData.workDetails;
                payload.workExperience = formData.workExperience;
            }

            if (isProvider) {
                // Provider: register via API directly (no auto-login)
                const res = await api.post('/auth/register', payload);

                // Upload documents if selected
                if (documents.length > 0 && res.data.user?.id) {
                    // Provider cant upload docs without being logged in per current routes,
                    // so docs are uploaded separately after admin approval.
                    // Show pending message instead.
                }

                setRegistrationComplete(true);
            } else {
                // Customer: auto-login via AuthContext
                await register(payload);
                navigate('/dashboard');
            }
        } catch (err) {
            if (err.response?.data?.errors) {
                setError(err.response.data.errors[0].message);
            } else {
                setError(err.response?.data?.message || 'Registration failed.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Provider registration complete — pending verification
    if (registrationComplete) {
        return (
            <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
                <div className="glass-card animate-scale-in w-full max-w-md p-8 text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="h-20 w-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <svg className="h-10 w-10 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Registration Submitted!</h2>
                    <p className="text-slate-300 mb-6 leading-relaxed">
                        Your service provider application has been submitted successfully.
                        An admin will review your details and verify your account.
                        You will be notified once your account is approved.
                    </p>
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 mb-6">
                        <p className="text-sm text-amber-400 font-medium">
                            ⏳ Verification Status: <span className="font-bold">Pending</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            You cannot log in until an admin approves your account.
                        </p>
                    </div>
                    <Link to="/login" className="btn-primary inline-block py-2 px-6">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    const isProvider = formData.role === 'provider';
    const totalSteps = isProvider ? 3 : 1;
    const currentStep = isProvider ? step : 1;

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
            <div className="glass-card animate-slide-in w-full max-w-lg p-8">
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
                    <p className="mt-2 text-sm text-slate-400">Join the Smart Local Services Platform</p>
                </div>

                {/* Step indicator for providers */}
                {isProvider && (
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition ${currentStep >= s
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-700 text-slate-400'
                                    }`}>
                                    {s}
                                </div>
                                {s < 3 && <div className={`w-8 h-0.5 ${currentStep > s ? 'bg-indigo-500' : 'bg-slate-700'}`} />}
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="mb-6 rounded-lg bg-red-500/10 p-4 text-sm font-medium text-red-400 border border-red-500/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* STEP 1: Basic Info */}
                    {currentStep === 1 && (
                        <>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="name">Full Name</label>
                                <input id="name" name="name" type="text" required className="input-field"
                                    placeholder="John Doe" value={formData.name} onChange={handleChange} />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="email">Email Address</label>
                                <input id="email" name="email" type="email" required className="input-field"
                                    placeholder="you@example.com" value={formData.email} onChange={handleChange} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="password">Password</label>
                                    <input id="password" name="password" type="password" required minLength="6"
                                        className="input-field" placeholder="••••••••" value={formData.password} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="confirmPassword">Confirm</label>
                                    <input id="confirmPassword" name="confirmPassword" type="password" required
                                        className="input-field" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">I want to join as:</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm font-medium transition-all ${formData.role === 'customer'
                                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                                        }`}>
                                        <input type="radio" name="role" value="customer" checked={formData.role === 'customer'} onChange={handleChange} className="sr-only" />
                                        🔍 Customer
                                    </label>
                                    <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm font-medium transition-all ${formData.role === 'provider'
                                        ? 'border-pink-500 bg-pink-500/20 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                                        }`}>
                                        <input type="radio" name="role" value="provider" checked={formData.role === 'provider'} onChange={handleChange} className="sr-only" />
                                        🛠 Provider
                                    </label>
                                </div>
                            </div>

                            {/* Customer: show everything in step 1 */}
                            {!isProvider && (
                                <>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="phone">Phone Number</label>
                                        <input id="phone" name="phone" type="tel" required className="input-field"
                                            placeholder="+1 234 567 890" value={formData.phone} onChange={handleChange} />
                                    </div>

                                    <div className="pt-2">
                                        <label className="mb-2 block text-sm font-medium text-slate-300">Location (Required)</label>
                                        <p className="mb-3 text-xs text-slate-400">Click on the map to pinpoint your location.</p>
                                        <div className="h-48 w-full rounded-xl overflow-hidden mb-3 border border-slate-700 bg-slate-800">
                                            <MapContainer center={[40.7128, -74.0060]} zoom={11} scrollWheelZoom={false}
                                                style={{ height: '100%', width: '100%' }}>
                                                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                <LocationMarker position={position} setPosition={setPosition} />
                                            </MapContainer>
                                        </div>
                                        <input id="address" name="address" type="text" className="input-field"
                                            placeholder="Address details (optional)" value={formData.address} onChange={handleChange} />
                                    </div>
                                </>
                            )}

                            {isProvider ? (
                                <button type="button" onClick={handleNext}
                                    className="btn-primary w-full py-3 mt-4 text-base">
                                    Next: Professional Details →
                                </button>
                            ) : (
                                <button type="submit" disabled={isLoading}
                                    className="btn-primary w-full flex justify-center py-3 mt-4 text-base">
                                    {isLoading ? (
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : 'Create Account'}
                                </button>
                            )}
                        </>
                    )}

                    {/* STEP 2: Provider Professional Details */}
                    {currentStep === 2 && isProvider && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="phone">Phone</label>
                                    <input id="phone" name="phone" type="tel" required className="input-field"
                                        placeholder="+1 234 567 890" value={formData.phone} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="dateOfBirth">Date of Birth</label>
                                    <input id="dateOfBirth" name="dateOfBirth" type="date" required className="input-field"
                                        value={formData.dateOfBirth} onChange={handleChange} />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="educationQualification">Education Qualification</label>
                                <input id="educationQualification" name="educationQualification" type="text" required className="input-field"
                                    placeholder="e.g., B.Tech, Certified Plumber" value={formData.educationQualification} onChange={handleChange} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="workCategory">Work Category</label>
                                    <select id="workCategory" name="workCategory" required className="input-field"
                                        value={formData.workCategory} onChange={handleChange}>
                                        <option value="">Select category</option>
                                        {WORK_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="workExperience">Experience</label>
                                    <input id="workExperience" name="workExperience" type="text" required className="input-field"
                                        placeholder="e.g., 5 years" value={formData.workExperience} onChange={handleChange} />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="workDetails">Work Details</label>
                                <textarea id="workDetails" name="workDetails" required className="input-field resize-none" rows="3"
                                    placeholder="Describe the services you offer, tools, specialization..."
                                    value={formData.workDetails} onChange={handleChange} />
                            </div>

                            <div className="flex gap-4 mt-4">
                                <button type="button" onClick={() => setStep(1)}
                                    className="btn-secondary flex-1 py-3">← Back</button>
                                <button type="button" onClick={() => { if (validateStep2()) setStep(3); }}
                                    className="btn-primary flex-1 py-3">Next: Location →</button>
                            </div>
                        </>
                    )}

                    {/* STEP 3: Provider Location + Documents */}
                    {currentStep === 3 && isProvider && (
                        <>
                            <div className="pt-2">
                                <label className="mb-2 block text-sm font-medium text-slate-300">Service Location (Required)</label>
                                <p className="mb-3 text-xs text-slate-400">Click on the map where you operate.</p>
                                <div className="h-48 w-full rounded-xl overflow-hidden mb-3 border border-slate-700 bg-slate-800">
                                    <MapContainer center={[40.7128, -74.0060]} zoom={11} scrollWheelZoom={false}
                                        style={{ height: '100%', width: '100%' }}>
                                        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <LocationMarker position={position} setPosition={setPosition} />
                                    </MapContainer>
                                </div>
                                <input id="address" name="address" type="text" className="input-field"
                                    placeholder="Address / landmark (optional)" value={formData.address} onChange={handleChange} />
                            </div>

                            <div className="mt-4 rounded-lg bg-slate-800/80 border border-slate-700 p-4">
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Proof Documents (PDF, max 5MB each)
                                </label>
                                <p className="text-xs text-slate-400 mb-3">Upload certifications, ID, or experience proof. You can also upload later from your dashboard.</p>
                                <input type="file" multiple accept=".pdf" onChange={handleFileChange}
                                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30" />
                                {documents.length > 0 && (
                                    <p className="text-xs text-emerald-400 mt-2">{documents.length} file(s) selected</p>
                                )}
                            </div>

                            <div className="flex gap-4 mt-4">
                                <button type="button" onClick={() => setStep(2)}
                                    className="btn-secondary flex-1 py-3">← Back</button>
                                <button type="submit" disabled={isLoading}
                                    className="btn-primary flex-1 flex justify-center py-3">
                                    {isLoading ? (
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : 'Submit Application'}
                                </button>
                            </div>
                        </>
                    )}
                </form>

                <p className="mt-6 text-center text-sm text-slate-400">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
