const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists natively for local dev
const uploadDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set Storage Engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Naming convention: UserID-Field-Timestamp.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, req.user ? `${req.user.id}-${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}` : `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// Check File Type
const filterPdfOnly = (req, file, cb) => {
    // Only accept PDF
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;

    if (extname === '.pdf' && mimetype === 'application/pdf') {
        return cb(null, true);
    } else {
        cb(new Error('Only PDF documents are allowed.'), false);
    }
};

// Init Upload Object config
const uploadDocs = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // Max 5MB per PDF constraint
    fileFilter: filterPdfOnly
});

module.exports = { uploadDocs };
