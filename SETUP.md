# ⚙️ คู่มือการตั้งค่า - ระบบจัดการเงินเดือน

## 📋 สิ่งที่ต้องเตรียม

### 1. สร้าง .env ไฟล์

คัดลอกจาก `.env.example` และเปลี่ยนชื่อเป็น `.env`

```bash
copy .env.ot-fo-aob .env
```

### 2. กรอกข้อมูลใน .env

#### MongoDB Atlas Connection String

```
mongodb+srv://nattaphontro_db_user:<db_password>@cluster0.ung5lli.mongodb.net/

**วิธีหา:**
1. Login เข้า [MongoDB Atlas](https://cloud.mongodb.com)
2. คลิก "Connect" บน Cluster ของคุณ  
3. เลือก "Connect your application"
4. คัดลอก Connection String
5. แทนที่ `<password>` ด้วยรหัสผ่านจริง

#### Google OAuth Credentials

```
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
```

**วิธีสร้าง:**

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)

2. สร้าง/เลือก Project

3. เปิดใช้งาน Google+ API:
   - ไปที่ "APIs & Services" → "Library"
   - ค้นหา "Google+ API"
   - คลิก "Enable"

4. สร้าง OAuth Client:
   - ไปที่ "Credentials"
   - คลิก "+ CREATE CREDENTIALS"
   - เลือก "OAuth client ID"
   - Application type: "Web application"
   
5. ตั้งค่า Authorized redirect URIs:
   ```
   http://localhost:5000/auth/google/callback
   ```

6. คัดลอก Client ID และ Client Secret

#### Session Secret

```
731620851891-ubdsnk781idub3tcemhsl675r1p5g857.apps.googleusercontent.com
```

เปลี่ยนเป็นค่าสุ่มใดๆ ที่คุณต้องการ

## ✅ ตัวอย่าง .env ที่กรอกข้อมูลแล้ว

```env
PORT=5000

MONGODB_URI=mongodb+srv://myuser:mypassword123@cluster0.abc123.mongodb.net/ot-finance-tracker?retryWrites=true&w=majority

GOOGLE_CLIENT_ID=123456789012-abcdefg1234567.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-aBcDeFgHiJkLmNoPqRsT
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

SESSION_SECRET=my_super_secret_key_2024_ot_aob

CLIENT_URL=http://localhost:5000
```

## 🚀 รันแอป

หลังจากกรอก .env เรียบร้อยแล้ว:

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่: **http://localhost:5000**

## ปัญหาที่พบบ่อย

### 1. MongoDB Connection Error

```
Error: Could not connect to MongoDB
```

**แก้ไข:**
- ตรวจสอบ Connection String
- เข้า MongoDB Atlas → Network Access → Add Current IP Address

### 2. Google OAuth Error

```
Error: redirect_uri_mismatch
```

**แก้ไข:**
- ตรวจสอบ Authorized redirect URIs ใน Google Console
- ต้องเป็น: `http://localhost:5000/auth/google/callback`
- **ระวัง:** ต้องมี `/callback` ด้วย

### 3. Session Error

```
Error: secret option required for sessions
```

**แก้ไข:**
- ตรวจสอบว่ามี SESSION_SECRET ใน .env

## 🌐 สำหรับ Production (Deploy จริง)

เมื่อต้องการ deploy บน hosting:

1. เปลี่ยน URL ทั้งหมดจาก `localhost` เป็น domain จริง
2. เพิ่ม Authorized redirect URI ใหม่ใน Google Console:
   ```
   https://yourdomain.com/auth/google/callback
   ```
3. อัปเดต .env:
   ```env
   GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
   CLIENT_URL=https://yourdomain.com
   ```

## 🔐 ความปลอดภัย

- ❌ **อย่า** commit ไฟล์ `.env` ลง Git
- ✅ มีไฟล์ `.gitignore` ป้องกันไว้แล้ว
- ✅ ใช้ `.env.example` เป็น template เท่านั้น
