# Home IoT System - Express Backend

Express.js backend สำหรับควบคุม Pico W IoT relay system ผ่าน REST API + MQTT + Scheduling

## โครงสร้างโปรเจ็กต์

```
backend/
├── server.js          # Express server หลัก
├── package.json       # Dependencies และ scripts
├── .env.example       # ตัวอย่าง environment variables
└── .env              # ไฟล์ config ของคุณ (ไม่ commit)
```

## ฟีเจอร์

- ✅ REST API เพื่อควบคุมรีเลย์บน Pico W
- ✅ CORS support สำหรับ frontend แยกต่างหาก
- ✅ Error handling และ logging
- ✅ Health check endpoint
- ✅ Proxy requests ไปยัง Pico W
- ✅ MQTT integration + Scheduler ที่ sync เวลากับ third-party server
- ✅ MongoDB Atlas storage สำหรับกำหนดการเปิด/ปิดอัตโนมัติ

## API Endpoints

### Health Check
```
GET /health
Response: {"status": "ok", "timestamp": "2025-11-19T..."}
```

### Get Relay Status
```
GET /api/relay/status
Response: {"state": "on"|"off", "success": true}
```

### Control Relay
```
POST /api/relay/control
Body: {"state": "on"|"off"}
Response: {"success": true, "state": "on"|"off", "data": {...}}
```

### Toggle Relay
```
POST /api/relay/toggle
Response: {"success": true, "previousState": "on", "newState": "off", "data": {...}}
```

### Time Sync (third-party)
```
GET /api/time/now
Response: {"now": "2025-11-19T11:00:00Z", "timezone": "Asia/Bangkok", "source": "worldtimeapi.org"}
```

### Scheduling APIs
```
GET    /api/schedules               # รายการกำหนดการทั้งหมด
POST   /api/schedules               # สร้างกำหนดการใหม่
PATCH  /api/schedules/:id/cancel    # ยกเลิกกำหนดการที่รอดำเนินการ
DELETE /api/schedules/:id           # ลบออกจากฐานข้อมูล
```

## การติดตั้ง

### 1. ติดตั้ง Dependencies

```cmd
cd backend
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` จาก `.env.example`:

```cmd
copy .env.example .env
```

แก้ไขไฟล์ `.env`:

**สำหรับการทดสอบโดยไม่มี Pico W (Mock Mode):**
```
PORT=3001
PICO_IP=192.168.1.100
MOCK_MODE=true
```

**สำหรับใช้งานจริงกับ Pico W:**
```
PORT=3001
PICO_IP=192.168.1.100
MOCK_MODE=false
```

**หมายเหตุ:** 
- เปลี่ยน `192.168.1.100` เป็น IP address จริงของ Pico W ของคุณ
- ตั้ง `MOCK_MODE=true` เพื่อทดสอบโดยไม่ต้องมี Pico W (เหมาะสำหรับพัฒนา frontend)
- ดึงค่าอื่น ๆ จากไฟล์ `.env.example` หากต้องการ reference

**ค่าที่จำเป็นสำหรับระบบ Scheduling และ MongoDB:**
- `MONGODB_URI` – connection string ของ MongoDB Atlas (ต้องเปิดให้ backend เข้าถึงได้)
- `TIMEZONE` – timezone หลักของระบบ (เช่น `Asia/Bangkok`) สำหรับแปลงเวลาที่ผู้ใช้ตั้ง
- `TIME_API_URL` – endpoint ของ third-party time provider (ดีฟอลต์ใช้ `https://worldtimeapi.org/api`)
- `SCHEDULER_INTERVAL_MS` – ความถี่ในการเช็คกำหนดการ (มิลลิวินาที) ค่า default คือ `30000`

### 3. อัพเดท Code บน Pico W

อัพโหลดไฟล์ `code.py` ที่แก้ไขแล้วไปยัง Pico W (ไฟล์นี้เพิ่ม REST API endpoints `/api/relay`)

ตรวจสอบว่าไฟล์ `settings.toml` บน Pico W มี:
```toml
CIRCUITPY_WIFI_SSID = "ชื่อ WiFi ของคุณ"
CIRCUITPY_WIFI_PASSWORD = "รหัสผ่าน WiFi"
```

## การรัน

### Development Mode (พร้อม auto-reload)
```cmd
npm run dev
```

### Production Mode
```cmd
npm start
```

Server จะรันที่ `http://localhost:3001`

## Mock Mode (โหมดทดสอบ)

### ทำไมต้องใช้ Mock Mode?

เมื่อคุณยังไม่มี Pico W หรือต้องการพัฒนา frontend โดยไม่ต้องเชื่อมต่อกับฮาร์ดแวร์จริง สามารถเปิด Mock Mode ได้โดยการตั้งค่า `MOCK_MODE=true` ในไฟล์ `.env`

### ฟีเจอร์ Mock Mode:

- ✅ จำลองการทำงานของรีเลย์โดยไม่ต้องมี Pico W
- ✅ เก็บสถานะรีเลย์ใน memory (on/off)
- ✅ Response เหมือนกับ API จริง พร้อม flag `"mock": true`
- ✅ เหมาะสำหรับการพัฒนาและทดสอบ UI

### การเปิด Mock Mode:

แก้ไขไฟล์ `.env`:
```
MOCK_MODE=true
```

รีสตาร์ทเซิร์ฟเวอร์ แล้วคุณจะเห็น:
```
🧪 MOCK MODE ENABLED - Simulating Pico W without hardware
```

## การทดสอบ

### ทดสอบด้วย curl (CMD)

**Health check:**
```cmd
curl http://localhost:3001/health
```

**ดูสถานะรีเลย์:**
```cmd
curl http://localhost:3001/api/relay/status
```

**เปิดรีเลย์:**
```cmd
curl -X POST http://localhost:3001/api/relay/control -H "Content-Type: application/json" -d "{\"state\": \"on\"}"
```

**ปิดรีเลย์:**
```cmd
curl -X POST http://localhost:3001/api/relay/control -H "Content-Type: application/json" -d "{\"state\": \"off\"}"
```

**Toggle รีเลย์:**
```cmd
curl -X POST http://localhost:3001/api/relay/toggle
```

### ทดสอบด้วย PowerShell

**Health check:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/health
```

**เปิดรีเลย์:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/relay/control -Method POST -Body (@{state="on"} | ConvertTo-Json) -ContentType "application/json"
```

**ปิดรีเลย์:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/relay/control -Method POST -Body (@{state="off"} | ConvertTo-Json) -ContentType "application/json"
```

## การ Troubleshoot

### ปัญหา: Cannot connect to Pico W

1. ตรวจสอบว่า Pico W เชื่อมต่อ WiFi สำเร็จ (ดูจาก serial console)
2. ตรวจสอบว่า IP address ใน `.env` ถูกต้อง
3. Ping Pico W: `ping <PICO_IP>`
4. ตรวจสอบว่า Pico W รัน code ใหม่ที่มี `/api/relay` endpoints

### ปัญหา: CORS errors

- Backend มี CORS middleware เปิดอยู่แล้ว
- ถ้ายังมีปัญหา ลองเพิ่ม specific origin ใน `server.js`:
  ```javascript
  app.use(cors({ origin: 'http://localhost:3000' }));
  ```

### ปัญหา: Port already in use

เปลี่ยน port ในไฟล์ `.env`:
```
PORT=3002
```

## ขั้นตอนถัดไป

1. สร้าง React frontend ที่เรียก API endpoints เหล่านี้
2. เพิ่ม authentication (JWT tokens)
3. เพิ่ม WebSocket สำหรับ real-time updates
4. เพิ่ม logging ไปยัง database
5. เพิ่มรีเลย์หลายช่อง

## Dependencies

- **express**: Web framework
- **cors**: เปิดใช้ CORS สำหรับ cross-origin requests
- **axios**: HTTP client สำหรับเรียก Pico W API
- **dotenv**: จัดการ environment variables
- **nodemon**: (dev) Auto-reload เมื่อโค้ดเปลี่ยน

## License

MIT
