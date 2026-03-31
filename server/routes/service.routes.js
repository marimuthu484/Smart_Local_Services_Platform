const router = require('express').Router();
const { createService, getServices, getService, updateService, deleteService, getMyServices } = require('../controllers/service.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { serviceValidator } = require('../validators');

// Public
router.get('/', getServices);
router.get('/:id', getService);

// Provider only
router.post('/', protect, authorize('provider'), serviceValidator, validate, createService);
router.get('/provider/me', protect, authorize('provider'), getMyServices);
router.put('/:id', protect, authorize('provider'), updateService);
router.delete('/:id', protect, authorize('provider', 'admin'), deleteService);

module.exports = router;
