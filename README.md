n# OT & กองทุนสำรองเลี้ยงชีพ - คู่มือการติดตั้ง

## ⚡ ความต้องการของระบบ
- Node.js (v14 ขึ้นไป)
- MongoDB Atlas Account
- Google Cloud Console Account

## 🚀 ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า MongoDB Atlas

1. ไปที่ [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. สร้าง Cluster ใหม่ (หรือใช้ของเดิม)
3. สร้าง Database ชื่อ `ot-finance-tracker`
4. คลิก "Connect" และคัดลอก Connection String
5. แทนที่ `<username>` และ `<password>` ใน Connection String

### 3. ตั้งค่า Google OAuth

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่ (หรือเลือกที่มีอยู่)
3. เปิดใช้งาน "Google+ API"
4. ไปที่ "Credentials" → "Create Credentials" → "OAuth client ID"
5. เลือก "Web application"
6. เพิ่ม Authorized redirect URIs:
   ```
   http://localhost:5000/auth/google/callback
   ```
7. คัดลอก **Client ID** และ **Client Secret**

### 4. สร้างไฟล์ .env

สร้างไฟล์ `.env` ในโฟลเดอร์หลัก และกรอกข้อมูลดังนี้:

```env
PORT=5000

mongodb+srv://nattaphontro_db_user:<db_password>@cluster0.ung5lli.mongodb.net/

GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

SESSION_SECRET=your_random_secret_key_here

CLIENT_URL=http://localhost:5000
```

**สำคัญ:** แทนที่ค่าต่างๆ ให้ถูกต้อง

### 5. รันแอปพลิเคชัน

```bash
npm run dev
```

แอปจะเปิดที่ `http://localhost:5000`

## 📱 คุณสมบัติ

### ✅ บันทึกโอที (OT Records)
- เพิ่ม/ลบบันทึก OT
- คำนวณเงิน OT อัตโนมัติ
- สรุปรายเดือนและรายปี

### 🏦 กองทุนสำรองเลี้ยงชีพ
- ตั้งค่าเงินเดือนพื้นฐาน
- ปรับส่วนพนักงาน 1-15%
- ส่วนนายจ้างคงที่ 5%
- บันทึกวันเริ่มสะสม
- แสดงระยะเวลาสะสม (ปี/เดือน)
- แสดงยอดสะสมรวม

### 💰 รายรับ-รายจ่าย
- บันทึกรายรับ/รายจ่าย
- หมวดหมู่แบบกำหนดเอง
- สรุปรายเดือนและรายปี
- แสดงยอดคงเหลือ

### 📊 แดชบอร์ด
- สรุปข้อมูลทั้งหมดในหน้าเดียว
- สลับดูแบบรายเดือน/รายปี
- อัปเดตอัตโนมัติ

## 🎨 คุณสมบัติพิเศษ

- 🌙 Dark Mode พร้อม Glassmorphism Design
- 📱 Mobile-First Responsive
- 🇹🇭 ภาษาไทยทั้งหมด + ฟอนต์ Prompt
- 🔐 ล็อกอินด้วย Google OAuth
- ฿ แสดงผลเป็นสกุลเงินบาท
- ✨ Micro-animations & Smooth Transitions

## 🔒 ความปลอดภัย

- ใช้ Google OAuth สำหรับการยืนยันตัวตน
- ข้อมูลทุกอย่างถูกแยกเฉพาะผู้ใช้
- Session Management ที่ปลอดภัย
- .env ไม่ถูก commit ลง Git

## 📝 หมายเหตุ

- สามารถใช้งานได้ทั้งบนมือถือและคอมพิวเตอร์
- แนะนำให้ใช้งานบนมือถือเพื่อประสบการณ์ที่ดีที่สุด
- ข้อมูลถูกเก็บใน MongoDB Atlas (Cloud) ปลอดภัย

## ❓ แก้ไขปัญหา

### ปัญหา: เชื่อมต่อ MongoDB ไม่ได้
- ตรวจสอบ Connection String ใน .env
- ตรวจสอบ Network Access ใน MongoDB Atlas (อนุญาต IP ของคุณ)

### ปัญหา: Google Login ไม่ทำงาน
- ตรวจสอบ Client ID และ Client Secret
- ตรวจสอบ Authorized redirect URIs ใน Google Console
- ต้องเป็น `http://localhost:5000/auth/google/callback`

## 🛠️ สำหรับ Production

เมื่อต้องการ deploy:
1. เปลี่ยน `GOOGLE_CALLBACK_URL` เป็น URL จริงของคุณ
2. เปลี่ยน `CLIENT_URL` เป็น URL จริงของคุณ
3. เปลี่ยน `SESSION_SECRET` เป็นค่าสุ่มที่ปลอดภัย
4. ตั้งค่า `NODE_ENV=production`
