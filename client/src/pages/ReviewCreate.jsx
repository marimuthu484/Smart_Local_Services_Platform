import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';

const ReviewCreate = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Please select a star rating');
            return;
        }

        setLoading(true);
        try {
            await api.post('/reviews', {
                booking: bookingId,
                rating,
                comment
            });
            navigate('/bookings', { state: { message: 'Review submitted successfully' } });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit review');
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto flex h-[calc(100vh-64px)] items-center justify-center p-4">
            <div className="glass-card animate-slide-in w-full max-w-lg p-8">
                <h2 className="mb-2 text-2xl font-bold text-white text-center">Rate Your Experience</h2>
                <p className="mb-8 text-center text-sm text-slate-400">
                    Your feedback helps providers improve and builds trust in the community.
                </p>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-500/10 p-4 text-sm font-medium text-red-400 border border-red-500/20 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center flex-col items-center gap-2">
                        <label className="text-sm font-medium text-slate-300">Tap to Rate</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className="transition-transform hover:scale-110 focus:outline-none"
                                    onMouseEnter={() => setHover(star)}
                                    onMouseLeave={() => setHover(0)}
                                    onClick={() => setRating(star)}
                                >
                                    {star <= (hover || rating) ? (
                                        <StarIconSolid className="h-10 w-10 text-amber-400" />
                                    ) : (
                                        <StarIconOutline className="h-10 w-10 text-slate-600 hover:text-amber-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {rating > 0 && <span className="text-xs text-amber-400 font-bold mt-2">{rating} out of 5 stars</span>}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Leave a Comment (Optional)
                        </label>
                        <textarea
                            rows="4"
                            className="input-field resize-none bg-slate-900 focus:bg-slate-800"
                            placeholder="Tell others what you liked about this service..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            maxLength={1000}
                        ></textarea>
                        <div className="mt-1 text-right text-xs text-slate-500">
                            {comment.length}/1000
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-700/50">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="btn-secondary flex-1 py-3"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || rating === 0}
                            className={`btn-primary flex-1 py-3 ${rating === 0 && 'opacity-50 cursor-not-allowed'}`}
                        >
                            {loading ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewCreate;
