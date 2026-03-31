const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Platform commission rate (%)
const PLATFORM_COMMISSION_RATE = 10;

/**
 * @route   POST /api/bookings
 * @desc    Create a booking (customer only)
 *
 * Conflict-free booking:
 * 1. Validate service exists and is active
 * 2. Check for overlapping bookings (same provider + date + slot, not rejected/cancelled)
 * 3. Create booking atomically with commission pre-calculated
 */
exports.createBooking = async (req, res, next) => {
    try {
        const { service: serviceId, date, timeSlot, notes, customerAddress, paymentMethod } = req.body;

        const service = await Service.findById(serviceId);
        if (!service || !service.isActive) {
            return res.status(404).json({ success: false, message: 'Service not found or inactive' });
        }

        // Check for overlapping bookings
        const conflictingBooking = await Booking.findOne({
            provider: service.provider,
            date: new Date(date),
            'timeSlot.start': timeSlot.start,
            status: { $nin: ['rejected', 'cancelled'] },
        });

        if (conflictingBooking) {
            return res.status(409).json({
                success: false,
                message: 'This time slot is already booked. Please choose another slot.',
            });
        }

        // Pre-calculate commission
        const totalAmount = service.price.amount;
        const commissionAmount = Math.round((totalAmount * PLATFORM_COMMISSION_RATE) / 100 * 100) / 100;
        const providerEarnings = totalAmount - commissionAmount;

        const booking = await Booking.create({
            customer: req.user.id,
            provider: service.provider,
            service: serviceId,
            date: new Date(date),
            timeSlot,
            notes,
            customerAddress,
            totalAmount,
            paymentMethod: paymentMethod || 'pending',
            commissionRate: PLATFORM_COMMISSION_RATE,
            commissionAmount,
            providerEarnings,
        });

        // Notify provider
        await Notification.create({
            user: service.provider,
            type: 'booking_created',
            title: 'New Booking Request',
            message: `New booking for ${service.title} — ₹${totalAmount} (Commission: ₹${commissionAmount})`,
            referenceId: booking._id,
        });

        const populated = await booking.populate([
            { path: 'service', select: 'title category price' },
            { path: 'customer', select: 'name phone' },
        ]);

        res.status(201).json({ success: true, booking: populated });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/bookings
 * @desc    Get bookings for the logged-in user (customer or provider)
 */
exports.getBookings = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = {};
        if (req.user.role === 'customer') {
            query.customer = req.user.id;
        } else if (req.user.role === 'provider') {
            query.provider = req.user.id;
        }

        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Booking.countDocuments(query);
        const bookings = await Booking.find(query)
            .populate('service', 'title category price images')
            .populate('customer', 'name phone avatar')
            .populate('provider', 'name phone avatar')
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: bookings.length,
            total,
            pages: Math.ceil(total / parseInt(limit)),
            bookings,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/bookings/:id
 * @desc    Get single booking
 */
exports.getBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('service', 'title category price images availability')
            .populate('customer', 'name phone avatar location')
            .populate('provider', 'name phone avatar location');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (
            booking.customer._id.toString() !== req.user.id &&
            booking.provider._id.toString() !== req.user.id &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, booking });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PATCH /api/bookings/:id/status
 * @desc    Update booking status (provider or customer for cancel)
 *
 * When status = 'completed':
 *   - Commission is calculated and recorded
 *   - Provider earnings are updated (net of commission)
 *   - Provider must pay commission to admin (tracked via commissionPaid flag)
 */
exports.updateBookingStatus = async (req, res, next) => {
    try {
        const { status, cancellationReason, paymentMethod } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const validTransitions = {
            pending: ['accepted', 'rejected', 'cancelled'],
            accepted: ['in-progress', 'cancelled'],
            'in-progress': ['completed', 'cancelled'],
        };

        const allowed = validTransitions[booking.status] || [];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition from '${booking.status}' to '${status}'`,
            });
        }

        const isProvider = booking.provider.toString() === req.user.id;
        const isCustomer = booking.customer.toString() === req.user.id;

        if (['accepted', 'rejected', 'in-progress', 'completed'].includes(status) && !isProvider) {
            return res.status(403).json({ success: false, message: 'Only the provider can perform this action' });
        }

        if (status === 'cancelled' && !isCustomer && !isProvider) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        booking.status = status;

        // Handle payment method update
        if (paymentMethod && ['online', 'cash'].includes(paymentMethod)) {
            booking.paymentMethod = paymentMethod;
        }

        // Handle cancellation
        if (status === 'cancelled' && cancellationReason) {
            booking.cancellationReason = cancellationReason;
            booking.cancelledBy = req.user.id;
            booking.cancelledAt = Date.now();
        }

        // ─── ON COMPLETION: Calculate commission & update earnings ───
        if (status === 'completed') {
            // Mark payment as paid
            booking.paymentStatus = 'paid';
            booking.paidAt = Date.now();

            // Ensure commission is calculated
            if (!booking.commissionAmount) {
                booking.commissionRate = PLATFORM_COMMISSION_RATE;
                booking.commissionAmount = Math.round((booking.totalAmount * PLATFORM_COMMISSION_RATE) / 100 * 100) / 100;
                booking.providerEarnings = booking.totalAmount - booking.commissionAmount;
            }

            // commissionPaid = false → provider owes this to admin
            booking.commissionPaid = false;

            // Update provider metrics (net earnings after commission)
            await User.findByIdAndUpdate(booking.provider, {
                $inc: {
                    totalEarnings: booking.providerEarnings,
                    completedJobs: 1
                }
            });

            // Notify provider about commission owed
            await Notification.create({
                user: booking.provider,
                type: 'booking_completed',
                title: 'Booking Completed — Commission Due',
                message: `Booking completed. You earned ₹${booking.providerEarnings}. Commission of ₹${booking.commissionAmount} (${booking.commissionRate}%) is due to the platform.`,
                referenceId: booking._id,
            });
        }

        await booking.save();

        // Notify the other party
        const notifyUser = isProvider ? booking.customer : booking.provider;
        const notifType = status === 'completed' ? 'booking_completed'
            : status === 'cancelled' ? 'booking_cancelled'
                : status === 'accepted' ? 'booking_accepted'
                    : status === 'rejected' ? 'booking_rejected'
                        : 'booking';

        await Notification.create({
            user: notifyUser,
            type: notifType,
            title: 'Booking Update',
            message: `Your booking status has been updated to: ${status}`,
            referenceId: booking._id,
        });

        res.json({ success: true, booking });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/bookings/availability/:serviceId
 * @desc    Get available slots for a service on a given date
 */
exports.getAvailability = async (req, res, next) => {
    try {
        const { date } = req.query;
        const service = await Service.findById(req.params.serviceId);

        if (!service) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        const { startTime, endTime, slotDuration } = service.availability;
        const allSlots = [];
        let [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
            const slotStart = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
            const slotEndMin = m + slotDuration;
            const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;
            allSlots.push({ start: slotStart, end: slotEnd });
        }

        const bookedSlots = await Booking.find({
            provider: service.provider,
            date: new Date(date),
            status: { $nin: ['rejected', 'cancelled'] },
        }).select('timeSlot');

        const bookedStarts = new Set(bookedSlots.map((b) => b.timeSlot.start));
        const availableSlots = allSlots.map((slot) => ({
            ...slot,
            available: !bookedStarts.has(slot.start),
        }));

        res.json({ success: true, date, slots: availableSlots });
    } catch (error) {
        next(error);
    }
};
