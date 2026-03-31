const Service = require('../models/Service');

/**
 * @route   POST /api/services
 * @desc    Create a new service (provider only)
 */
exports.createService = async (req, res, next) => {
    try {
        req.body.provider = req.user.id;
        const service = await Service.create(req.body);
        res.status(201).json({ success: true, service });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/services
 * @desc    Get all services with search, filter, pagination leveraging advanced Geospatial queries.
 */
exports.getServices = async (req, res, next) => {
    try {
        const { search, category, city, lat, lng, radius, page = 1, limit = 12, sort = '-createdAt' } = req.query;

        const maxDistance = (radius || 50) * 1000; // km to meters. Default 50km
        const limitNum = parseInt(limit);
        const skipNum = (parseInt(page) - 1) * limitNum;

        // Base match block for active services
        const matchStage = { isActive: true };

        if (search) {
            matchStage.$text = { $search: search };
        }
        if (category) {
            matchStage.category = category;
        }
        if (city) {
            matchStage['location.city'] = { $regex: city, $options: 'i' };
        }

        let pipeline = [];
        let total = 0;

        // If coordinates are provided, we MUST use $geoNear as the absolute first stage in the pipeline
        if (lat && lng) {
            pipeline.push({
                $geoNear: {
                    near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                    distanceField: 'calculatedDistance',
                    maxDistance: maxDistance,
                    spherical: true, // Spherical geometry (KNN behavior internally)
                    query: matchStage // $geoNear supports matching alongside sorting out of the box
                }
            });

            // Count total pipeline result before limits (Subpipeline for counting)
            const countPipeline = [...pipeline, { $count: 'total' }];
            const countResult = await Service.aggregate(countPipeline);
            total = countResult.length > 0 ? countResult[0].total : 0;

        } else {
            // Standard Find queries if no geo logic required
            pipeline.push({ $match: matchStage });

            // Standard sort mapping (e.g '-createdAt' to structured sort obj)
            const sortObj = {};
            if (sort.startsWith('-')) {
                sortObj[sort.substring(1)] = -1;
            } else {
                sortObj[sort] = 1;
            }
            pipeline.push({ $sort: sortObj });

            // Count
            total = await Service.countDocuments(matchStage);
        }

        // Pagination applied uniformly
        pipeline.push({ $skip: skipNum });
        pipeline.push({ $limit: limitNum });

        // Populate provider schema via $lookup
        pipeline.push(
            {
                $lookup: {
                    from: 'users',
                    localField: 'provider',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { name: 1, avatar: 1, averageRating: 1, totalReviews: 1, isVerifiedProvider: 1 } }
                    ],
                    as: 'providerData'
                }
            },
            {
                $unwind: '$providerData'
            },
            // Repackage the output to conform to standard Mongoose `.populate()` structure natively expected by React
            {
                $addFields: { provider: '$providerData' }
            },
            {
                $project: { providerData: 0 }
            }
        );

        const services = await Service.aggregate(pipeline);

        res.json({
            success: true,
            count: services.length,
            total,
            pages: Math.ceil(total / limitNum),
            currentPage: parseInt(page),
            services,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/services/:id
 * @desc    Get single service
 */
exports.getService = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id).populate('provider', 'name avatar rating totalReviews phone bio location');

        if (!service) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        res.json({ success: true, service });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/services/:id
 * @desc    Update service (provider only, own service)
 */
exports.updateService = async (req, res, next) => {
    try {
        let service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        if (service.provider.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this service' });
        }

        service = await Service.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.json({ success: true, service });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete service (provider or admin)
 */
exports.deleteService = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        if (service.provider.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await service.deleteOne();
        res.json({ success: true, message: 'Service deleted' });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/services/provider/me
 * @desc    Get services for logged-in provider
 */
exports.getMyServices = async (req, res, next) => {
    try {
        const services = await Service.find({ provider: req.user.id }).sort('-createdAt');
        res.json({ success: true, count: services.length, services });
    } catch (error) {
        next(error);
    }
};
