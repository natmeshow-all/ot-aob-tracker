/**
 * Reset password for migrated user
 * Run: node reset-password.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function resetPassword() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Show all users
    const users = await User.find({}).lean();
    console.log('👤 Users in database:');
    users.forEach(u => {
        console.log(`   - ${u.email} | name: ${u.name} | hasPassword: ${!!u.password}`);
    });
    console.log('');

    // Reset password for natshow@outlook.com to "natshow1234"
    const newPassword = 'natshow1234';
    const hash = await bcrypt.hash(newPassword, 10);

    const result = await User.findOneAndUpdate(
        { email: 'natshow@outlook.com' },
        { password: hash },
        { new: true }
    );

    if (result) {
        console.log(`✅ Password reset for: ${result.email}`);
        console.log(`   New password: ${newPassword}`);
    } else {
        console.log('❌ User not found');
    }

    await mongoose.disconnect();
}

resetPassword().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
