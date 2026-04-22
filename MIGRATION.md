# MongoDB to Firebase Data Migration Script

This script helps you migrate your existing data from MongoDB to Firebase Firestore.

## Prerequisites

1. Export data from MongoDB Atlas
2. Have Firebase project ready
3. Node.js installed

## Steps

### 1. Export from MongoDB

```bash
# Install MongoDB Database Tools if not installed
# Then export your data

mongoexport --uri="YOUR_MONGODB_URI" --collection=otrecords --out=otrecords.json
mongoexport --uri="YOUR_MONGODB_URI" --collection=providentfunds --out=providentfunds.json
mongoexport --uri="YOUR_MONGODB_URI" --collection=transactions --out=transactions.json
mongoexport --uri="YOUR_MONGODB_URI" --collection=users --out=users.json
```

### 2. Prepare Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Firestore Database
4. Click "Create database"
5. Choose "Start in production mode" or "test mode"

### 3. Run Migration Script

```bash
node migrate-to-firebase.js
```

## Firebase Collections Structure

### users
```
users/{userId}
  - email: string
  - name: string
  - picture: string
  - createdAt: timestamp
```

### otRecords
```
otRecords/{recordId}
  - userId: string
  - date: timestamp
  - hours: number
  - hourly Rate: number
  - total: number
  - description: string
  - month: number
  - year: number
   - createdAt: timestamp
```

### providentFunds
```
providentFunds/{userId}
  - baseSalary: number
  - employeePercentage: number (1-15)
  - employerPercentage: number (5)
  - startDate: timestamp
  - contributions: array
    - month: number
    - year: number
    - employeeContribution: number
    - employerContribution: number
    - totalMonthly: number
  - createdAt: timestamp
```

### transactions
```
transactions/{transactionId}
  - userId: string
  - date: timestamp
  - type: string ('income' | 'expense')
  - category: string
  - amount: number
  - description: string
  - month: number
  - year: number
  - createdAt: timestamp
```

## Manual Migration (Alternative)

If you prefer to migrate manually or have small amount of data:

1. **Login to new app** with Google
2. **Re-enter all data** through the UI
3. **Verify** everything works

This is the safest approach if you don't have much data.

## Notes

- User authentication will be fresh (Firebase Auth)
- Users need to sign in with Google again
- Old MongoDB data can be kept as backup
- Test thoroughly before deleting MongoDB data
