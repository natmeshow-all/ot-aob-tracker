/**
 * Migration Script: database.json → MongoDB Atlas
 * Run with: node migrate.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const data = require('./database.json');

const User = require('./models/User');

async function migrate() {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const db = mongoose.connection;

    // ── 1. Users ──────────────────────────────────────────
    console.log(`👤 Migrating ${data.users.length} users...`);
    const userIdMap = {}; // old UUID → new ObjectId

    for (const u of data.users) {
        let user = await User.findOne({ email: u.email });
        if (!user) {
            user = await User.create({
                email: u.email,
                password: u.password,
                name: u.name,
                createdAt: new Date(u.createdAt)
            });
            console.log(`   ✅ Created user: ${u.email} → ${user._id}`);
        } else {
            console.log(`   ⏭️  Skip (exists): ${u.email} → ${user._id}`);
        }
        userIdMap[u.id] = user._id;
    }
    console.log('');

    // ── 2. OT Records (direct insert, bypass hooks) ───────
    console.log(`⏱️  Migrating ${data.otRecords.length} OT records...`);
    const otCol = db.collection('otrecords');
    let otCreated = 0, otSkipped = 0;

    for (const r of data.otRecords) {
        const userId = userIdMap[r.userId];
        if (!userId) { console.log(`   ⚠️  No user for OT ${r.id}`); continue; }

        const exists = await otCol.findOne({ userId, date: new Date(r.date), total: r.total });
        if (exists) { otSkipped++; continue; }

        await otCol.insertOne({
            _id: new mongoose.Types.ObjectId(),
            userId,
            date: new Date(r.date),
            hours: r.hours,
            hourlyRate: r.hourlyRate,
            baseSalary: r.baseSalary || 0,
            multiplier: r.multiplier || 1,
            total: r.total,
            description: r.description || '',
            month: r.month,
            year: r.year,
            createdAt: new Date(r.createdAt)
        });
        otCreated++;
    }
    console.log(`   ✅ Created: ${otCreated}, Skipped: ${otSkipped}\n`);

    // ── 3. Provident Fund (direct insert) ─────────────────
    console.log(`🏦 Migrating provident fund...`);
    const fundCol = db.collection('providentfunds');

    for (const f of data.providentFunds) {
        const userId = userIdMap[f.userId];
        if (!userId) continue;

        const exists = await fundCol.findOne({ userId });
        if (exists) { console.log(`   ⏭️  Skip (exists): fund`); continue; }

        const contributions = (f.contributions || []).map(c => ({
            _id: new mongoose.Types.ObjectId(),
            date: new Date(c.date),
            baseSalary: c.baseSalary || f.baseSalary || 0,
            employeePercent: c.employeePercent || f.employeePercentage || 5,
            employerPercent: c.employerPercent || f.employerPercentage || 5,
            employeeAmount: c.employeeAmount || 0,
            employerAmount: c.employerAmount || 0,
            totalMonthly: c.totalMonthly || 0,
            description: c.description || '',
            createdAt: new Date(c.createdAt)
        }));

        await fundCol.insertOne({
            _id: new mongoose.Types.ObjectId(),
            userId,
            baseSalary: f.baseSalary || 0,
            employeePercentage: f.employeePercentage || 5,
            employerPercentage: f.employerPercentage || 5,
            startDate: new Date(f.startDate),
            cutoffDate: f.cutoffDate || 0,
            contributions,
            updatedAt: new Date(f.updatedAt)
        });
        console.log(`   ✅ Created fund with ${contributions.length} contributions`);
    }
    console.log('');

    // ── 4. Transactions (direct insert) ───────────────────
    console.log(`💰 Migrating ${data.transactions.length} transactions...`);
    const txCol = db.collection('transactions');
    let txCreated = 0, txSkipped = 0;

    for (const t of data.transactions) {
        const userId = userIdMap[t.userId];
        if (!userId) continue;

        const exists = await txCol.findOne({ userId, date: new Date(t.date), category: t.category, amount: t.amount });
        if (exists) { txSkipped++; continue; }

        await txCol.insertOne({
            _id: new mongoose.Types.ObjectId(),
            userId,
            type: t.type,
            date: new Date(t.date),
            category: t.category,
            amount: t.amount,
            foodDays: t.foodDays ?? null,
            foodRate: t.foodRate ?? null,
            description: t.description || '',
            month: t.month,
            year: t.year,
            createdAt: new Date(t.createdAt)
        });
        txCreated++;
    }
    console.log(`   ✅ Created: ${txCreated}, Skipped: ${txSkipped}\n`);

    // ── Summary ───────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Migration completed!');
    console.log(`   Users       : ${await db.collection('users').countDocuments()}`);
    console.log(`   OT Records  : ${await db.collection('otrecords').countDocuments()}`);
    console.log(`   Fund        : ${await db.collection('providentfunds').countDocuments()}`);
    console.log(`   Transactions: ${await db.collection('transactions').countDocuments()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
