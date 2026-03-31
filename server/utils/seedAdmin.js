const User = require('../models/User');

const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });

        if (!adminExists) {
            console.log('No Admin user found. Seeding initial admin...');

            // Use findOneAndUpdate with upsert to avoid duplicate key errors
            await User.findOneAndUpdate(
                { email: 'admin@smartlocal.com' },
                {
                    $setOnInsert: {
                        name: 'System Admin',
                        email: 'admin@smartlocal.com',
                        password: require('bcryptjs').hashSync('adminPassword123!', 10),
                        role: 'admin',
                        requiresPasswordChange: true,
                        isVerifiedProvider: false,
                        isBlocked: false
                    }
                },
                { upsert: true, new: true }
            );

            console.log('Initial Admin seeded successfully.');
            console.log('  Email:    admin@smartlocal.com');
            console.log('  Password: adminPassword123!');
        } else {
            console.log('Admin user already exists. Skipping seeding.');
        }
    } catch (error) {
        // Non-fatal — log and continue server startup
        console.error('Admin seed warning:', error.message);
    }
};

module.exports = seedAdmin;
