# Home IoT System - React Frontend

React frontend สำหรับควบคุม Pico W IoT relay system ผ่านเว็บบราวเซอร์

## โครงสร้างโปรเจ็กต์

```
frontend/
├── src/
│   ├── App.jsx         # Main component
│   ├── App.css         # Styles
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies
```

## ฟีเจอร์

- ✅ UI สวยงามและใช้งานง่าย
- ✅ แสดงสถานะรีเลย์แบบ real-time
- ✅ ปุ่มควบคุม: เปิด, ปิด, สลับ
- ✅ รองรับ Mock Mode (ทดสอบโดยไม่มี Pico W)
- ✅ Responsive design (รองรับมือถือ)
- ✅ แสดงเวลาอัพเดทล่าสุด
- ✅ Error handling และ loading states

## การติดตั้ง

### 1. ติดตั้ง Dependencies

```cmd
cd frontend
npm install
```

### 2. ตรวจสอบการตั้งค่า Backend

แก้ไข `vite.config.js` ถ้าต้องการเปลี่ยน port ของ backend:

```javascript
export default defineConfig({
  server: {
    port: 3000,  // Frontend port
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // Backend URL
        changeOrigin: true,
      }
    }
  }
})
```

## การรัน

### Development Mode

```cmd
npm run dev
```

Frontend จะรันที่ `http://localhost:3000`

### Build สำหรับ Production

```cmd
npm run build
```

ไฟล์ build จะอยู่ในโฟลเดอร์ `dist/`

### Preview Production Build

```cmd
npm run preview
```

## การใช้งาน

### 1. เริ่ม Backend ก่อน

```cmd
cd backend
npm start
```

Backend ต้องรันที่ `http://localhost:3001` (หรือตาม config ของคุณ)

### 2. เริ่ม Frontend

```cmd
cd frontend
npm run dev
```

### 3. เปิดบราวเซอร์

ไปที่ `http://localhost:3000`

## UI Components

### Status Card
- แสดงสถานะปัจจุบันของรีเลย์ (เปิด/ปิด)
- ไฟแสดงสถานะที่เปลี่ยนสีตามสถานะ
- แสดงเวลาที่อัพเดทล่าสุด

### Control Buttons
- **เปิด (💡)**: เปิดรีเลย์
- **สลับ (🔄)**: สลับสถานะรีเลย์
- **ปิด (🌙)**: ปิดรีเลย์

### Mock Mode Badge
- แสดงป้าย "🧪 Mock Mode" เมื่อ backend อยู่ใน mock mode
- ช่วยให้รู้ว่ากำลังทดสอบโดยไม่มี Pico W

## การ Deploy

### Option 1: รันบน localhost (เครื่อง dev)

เหมาะสำหรับพัฒนาหรือใช้งานส่วนตัว:

```cmd
npm run dev
```

### Option 2: Build และ deploy บน static host

Build frontend:
```cmd
npm run build
```

นำไฟล์ใน `dist/` ไป deploy บน:
- Netlify
- Vercel
- GitHub Pages
- Firebase Hosting

**หมายเหตุ**: ต้องตั้งค่า backend URL ให้ชี้ไปยัง Express server จริง (ไม่ใช่ localhost)

### Option 3: รันบนเครื่อง client อื่น

ถ้าต้องการรัน frontend บนเครื่องอื่นในเครือข่ายเดียวกัน:

1. แก้ไข `vite.config.js`:
```javascript
export default defineConfig({
  server: {
    host: '0.0.0.0',  // เปิดให้เข้าถึงจากเครื่องอื่น
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://192.168.1.X:3001',  // IP ของเครื่องที่รัน backend
        changeOrigin: true,
      }
    }
  }
})
```

2. รัน frontend:
```cmd
npm run dev
```

3. เข้าถึงจากเครื่องอื่นผ่าน: `http://<IP-ของเครื่อง-frontend>:3000`

### Option 4: Production บนเครื่องเดียวกับ Backend

Build frontend:
```cmd
npm run build
```

ย้ายไฟล์ใน `dist/` ไปให้ Express serve:

ใน `backend/server.js` เพิ่ม:
```javascript
const path = require('path');

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

จากนั้นรันแค่ backend เดียว:
```cmd
cd backend
npm start
```

เข้าถึงได้ที่ `http://localhost:3001`

## Troubleshooting

### ปัญหา: ไม่สามารถเชื่อมต่อกับ backend

1. ตรวจสอบว่า backend รันอยู่ที่ port 3001
2. ตรวจสอบ proxy config ใน `vite.config.js`
3. ดู console log ใน browser developer tools

### ปัญหา: CORS errors

- ใช้ Vite proxy (default config) จะไม่มีปัญหา CORS
- ถ้า deploy แยกกัน ต้องตั้งค่า CORS ใน backend ให้ยอมรับ origin ของ frontend

### ปัญหา: Mock Mode ไม่แสดง

- ตรวจสอบว่า backend ตั้งค่า `MOCK_MODE=true` ใน `.env`
- Backend จะส่ง `"mock": true` กลับมาใน response

## Tech Stack

- **React 18**: UI library
- **Vite**: Build tool และ dev server
- **Axios**: HTTP client
- **CSS3**: Animations และ responsive design

## ขั้นตอนถัดไป

- [ ] เพิ่ม WebSocket สำหรับ real-time updates
- [ ] เพิ่ม authentication (login)
- [ ] เพิ่มหน้าประวัติการใช้งาน
- [ ] เพิ่มการตั้งเวลา (scheduling)
- [ ] รองรับรีเลย์หลายช่อง
- [ ] เพิ่ม PWA support (ติดตั้งเป็น app บนมือถือ)

## License

MIT
