# Home IoT System

ระบบควบคุม IoT แบบเต็มรูปแบบด้วย Pico W (CircuitPython), Express.js Backend, React Frontend และ MQTT สำหรับควบคุมจากระยะไกล

## 📋 ภาพรวมโปรเจ็กต์

โปรเจ็กต์นี้ประกอบด้วย 3 ส่วนหลัก:

1. **Pico W (IoT Device)**: ควบคุมรีเลย์และเปิด REST API + MQTT
2. **Express Backend**: Gateway API, MQTT client และ mock mode สำหรับทดสอบ
3. **React Frontend**: Web UI พร้อม Real-time updates ผ่าน MQTT WebSocket

## 🏗️ โครงสร้างโปรเจ็กต์

```
Home-IoT-System/
├── code.py              # CircuitPython สำหรับ Pico W (HTTP + MQTT auto-fallback)
├── settings.toml        # WiFi + MQTT config สำหรับ Pico W
├── MQTT_SETUP.md        # คู่มือการตั้งค่า MQTT
├── backend/             # Express.js backend
│   ├── server.js        # Express server + MQTT client
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── frontend/            # React frontend
│   ├── src/
│   │   ├── App.jsx      # Main component with MQTT WebSocket
│   │   └── mqttConfig.js # MQTT configuration
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
└── lib/                 # Adafruit libraries สำหรับ Pico W
```

## 🚀 Quick Start

### การทดสอบโดยไม่มี Pico W (Mock Mode + MQTT)

#### 1. เริ่ม Backend (Mock Mode + MQTT)

```cmd
cd backend
npm install
copy .env.example .env
```

แก้ไข `.env`:
```
MOCK_MODE=true
MQTT_ENABLED=true
MQTT_BROKER=mqtt://broker.hivemq.com
```

รัน backend:
```cmd
npm start
```

คุณจะเห็น:
```
🌐 MQTT ENABLED - Connecting to broker
📡 MQTT Connected to broker
```

#### 2. เริ่ม Frontend

```cmd
cd frontend
npm install
npm run dev
```

เปิดบราวเซอร์ที่ `http://localhost:3000`

คุณจะเห็น badge:
- ✨ **Real-time ON** (สีเขียว) - MQTT WebSocket เชื่อมต่อแล้ว
- 🌐 **Backend MQTT** (สีเขียว) - Backend เชื่อมต่อ MQTT broker

#### 3. ทดสอบ Real-time Updates

เปิดหลายแท็บหรือหลายเครื่อง ลองกดปุ่ม ON/OFF - **ทุกแท็บจะอัพเดทพร้อมกันทันที!** ⚡

### การใช้งานจริงกับ Pico W

#### 1. Setup Pico W

1. ติดตั้ง CircuitPython บน Pico W
2. (Optional) ติดตั้ง `adafruit_minimqtt` library ใน `lib/` หากต้องการใช้ MQTT
3. คัดลอก `code.py` ไปยัง Pico W
4. คัดลอกโฟลเดอร์ `lib/` ทั้งหมดไปยัง Pico W
5. สร้างไฟล์ `settings.toml` บน Pico W:
   
   **แบบ HTTP-only (ไม่ใช้ MQTT):**
   ```toml
   CIRCUITPY_WIFI_SSID = "ชื่อ WiFi"
   CIRCUITPY_WIFI_PASSWORD = "รหัสผ่าน"
   # MQTT_ENABLED = "false" (หรือไม่ต้องใส่)
   ```
   
   **แบบ HTTP + MQTT (รองรับ remote access):**
   ```toml
   CIRCUITPY_WIFI_SSID = "ชื่อ WiFi"
   CIRCUITPY_WIFI_PASSWORD = "รหัสผ่าน"
   
   # MQTT Settings (ต้องตรงกับ backend/.env)
   MQTT_ENABLED = "true"
   MQTT_BROKER = "broker.hivemq.com"
   MQTT_PORT = "1883"
   MQTT_USERNAME = ""
   MQTT_PASSWORD = ""
   ```

6. เชื่อมต่อรีเลย์กับ GPIO14 (GP14)
7. จดไว้ว่า IP address ของ Pico W คือเท่าไร

**หมายเหตุ:** `code.py` จะ **auto-detect** ว่ามี MQTT library หรือไม่
- ถ้ามี + `MQTT_ENABLED="true"` → ทำงานแบบ HTTP + MQTT
- ถ้าไม่มี library หรือ connection ล้มเหลว → auto-fallback เป็น HTTP-only

#### 2. Setup Backend

```cmd
cd backend
npm install
copy .env.example .env
```

แก้ไข `.env`:
```
PORT=3001
PICO_IP=192.168.1.XXX  # IP ของ Pico W
MOCK_MODE=false
MQTT_ENABLED=true
MQTT_BROKER=mqtt://broker.hivemq.com
```

รัน backend:
```cmd
npm start
```

#### 3. Setup Frontend

```cmd
cd frontend
npm install
npm run dev
```

เปิดบราวเซอร์ที่ `http://localhost:3000`

## 📡 API Endpoints & MQTT Topics

### Backend API (Express)

```
GET  /health                  - Health check (รวมสถานะ MQTT)
GET  /api/relay/status        - ดูสถานะรีเลย์
POST /api/relay/control       - ควบคุมรีเลย์ {"state": "on"|"off"}
POST /api/relay/toggle        - สลับสถานะรีเลย์
```

### Pico W API (CircuitPython)

```
GET  /api/relay               - ดูสถานะรีเลย์ (JSON)
POST /api/relay               - ควบคุมรีเลย์ (JSON)
GET  /                        - หน้าเว็บควบคุมแบบเดิม
```

### MQTT Topics

```
home-iot/relay/control        - Publish: ส่งคำสั่ง {"state": "on"|"off"}
home-iot/relay/status         - Subscribe: รับสถานะรีเลย์
home-iot/system/status        - Subscribe: รับสถานะ backend
home-iot/device/status        - Subscribe: รับสถานะ Pico W
```

### MQTT Configuration

⚠️ **สำคัญ:** ต้องตั้งค่า MQTT ให้**ตรงกัน 3 ที่**:

1. **`settings.toml`** (Pico W) - TCP port 1883
2. **`backend/.env`** (Backend) - TCP port 1883
3. **`frontend/src/mqttConfig.js`** (Frontend) - WebSocket port 8884

**MQTT Brokers:**

**สำหรับทดสอบ (Public - ไม่ต้อง authentication):**
- Pico W: `broker.hivemq.com:1883` (MQTT TCP)
- Backend: `mqtt://broker.hivemq.com:1883`
- Frontend: `wss://broker.hivemq.com:8884/mqtt` (WebSocket SSL)

**สำหรับ Production:**
- ติดตั้ง Mosquitto บนเครื่องตัวเอง
- ตั้งค่า authentication และ SSL
- ดูรายละเอียดใน [MQTT_SETUP.md](MQTT_SETUP.md)

## 🎨 Features

### Frontend (React)
- ✅ UI สวยงาม responsive
- ✅ **Real-time updates ผ่าน MQTT WebSocket**
- ✅ ปุ่มควบคุม: เปิด, ปิด, สลับ
- ✅ แสดง MQTT connection status
- ✅ แสดง Mock Mode badge
- ✅ **Sync หลายอุปกรณ์พร้อมกัน**
- ✅ Fallback to HTTP API
- ✅ Error handling
- ✅ Loading states

### Backend (Express)
- ✅ REST API proxy ไปยัง Pico W
- ✅ **MQTT Client (Pub/Sub)**
- ✅ Mock Mode สำหรับทดสอบ
- ✅ **รับคำสั่งจาก MQTT และส่งต่อไปยัง Pico W**
- ✅ CORS support
- ✅ Auto-reconnect MQTT
- ✅ Error handling
- ✅ Logging

### Pico W (CircuitPython)
- ✅ WiFi connectivity
- ✅ HTTP server + REST API
- ✅ **MQTT Client (Pub/Sub) with auto-fallback**
- ✅ Relay control
- ✅ **รับคำสั่งจากทั้ง HTTP และ MQTT**
- ✅ **Auto-detect MQTT library และ graceful degradation**
- ✅ Auto-restart on errors
- ✅ Single unified `code.py` for all scenarios

## 🔧 การ Deploy

### Option 1: Development (localhost)
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`
- MQTT: WebSocket to public broker

### Option 2: Production (เครื่องเดียว)
Build frontend แล้วให้ Express serve:
```cmd
cd frontend
npm run build
```

ปรับ backend ให้ serve static files จาก `frontend/dist/`

### Option 3: Deploy แยกเครื่อง
- Deploy frontend บน Vercel/Netlify
- รัน backend บนเครื่องที่เข้าถึง Pico W ได้
- ตั้งค่า MQTT broker (Mosquitto/HiveMQ Cloud)
- Frontend เชื่อมต่อ MQTT ผ่าน WebSocket

### Option 4: ควบคุมจากภายนอก LAN
1. ติดตั้ง Mosquitto broker บน VPS/Cloud
2. เปิด port 1883 (MQTT) และ 8884 (WebSocket)
3. ตั้งค่า authentication
4. ใช้ mobile MQTT client app ควบคุมจากทุกที่

## 🛠️ Tech Stack

- **IoT Device**: Raspberry Pi Pico W + CircuitPython + adafruit_minimqtt
- **Backend**: Node.js + Express.js + Axios + MQTT.js
- **Frontend**: React 18 + Vite + Axios + MQTT.js (WebSocket)
- **MQTT Broker**: HiveMQ (Public) / Mosquitto (Self-hosted)
- **Hardware**: Relay module (GPIO14)
- **Protocol**: HTTP REST API + MQTT (TCP/WebSocket)

## 📚 Documentation

ดูรายละเอียดเพิ่มเติมใน:
- [Backend README](backend/README.md) - Express server + MQTT setup
- [Frontend README](frontend/README.md) - React app + WebSocket MQTT
- [MQTT Setup Guide](MQTT_SETUP.md) - การตั้งค่า MQTT broker และทดสอบ

## 🐛 Troubleshooting

### Backend ไม่เชื่อมต่อ Pico W
- ตรวจสอบ IP address ใน `.env`
- Ping Pico W: `ping <PICO_IP>`
- ตรวจสอบว่า Pico W รัน code ใหม่ที่มี API endpoints

### Frontend ไม่เชื่อมต่อ Backend
- ตรวจสอบว่า backend รันที่ port 3001
- ตรวจสอบ proxy config ใน `vite.config.js`
- ดู console log ใน browser

### MQTT ไม่เชื่อมต่อ

**Pico W:**
- ตรวจสอบว่าติดตั้ง `adafruit_minimqtt` library แล้ว
- ตรวจสอบ `MQTT_ENABLED="true"` ใน `settings.toml`
- ดู serial console - ต้องเห็น "✓ MQTT enabled"
- ถ้าเห็น "⚠ MQTT setup failed" → จะ auto-fallback เป็น HTTP-only

**Backend:**
- ตรวจสอบ `MQTT_ENABLED=true` ใน backend `.env`
- ตรวจสอบ URL: `mqtt://broker.hivemq.com` (มี `mqtt://` prefix)
- ดู console log - ต้องเห็น "📡 MQTT Connected"

**Frontend:**
- ตรวจสอบ URL: `wss://broker.hivemq.com:8884/mqtt` (WebSocket SSL)
- ดู browser console - ต้องเห็น "✅ Frontend MQTT Connected"
- Badge ต้องแสดง "✨ Real-time ON" สีเขียว

**ทั่วไป:**
- Ping broker: `ping broker.hivemq.com`
- ลองใช้ MQTT Explorer เพื่อทดสอบ broker
- ตรวจสอบว่า broker, port, topics **ตรงกันทั้ง 3 ที่**

### Frontend ไม่แสดง Real-time
- ดู browser console - ต้องเห็น "✅ Frontend MQTT Connected"
- ตรวจสอบว่า broker รองรับ WebSocket (port 8884)
- Badge ต้องแสดง "✨ Real-time ON" สีเขียว

### Mock Mode ไม่ทำงาน
- ตรวจสอบ `MOCK_MODE=true` ใน `backend/.env`
- Restart backend

## 🎯 ขั้นตอนถัดไป

- [x] ✅ เพิ่ม MQTT สำหรับ remote access
- [x] ✅ Real-time sync ผ่าน WebSocket
- [ ] เพิ่ม authentication (JWT/OAuth)
- [ ] ติดตั้ง Mosquitto broker แบบ self-hosted
- [ ] รองรับรีเลย์หลายช่อง
- [ ] เพิ่มการตั้งเวลา (scheduling)
- [ ] บันทึกประวัติการใช้งาน (database)
- [ ] Dashboard แสดงกราฟสถิติ
- [ ] Mobile app (React Native)
- [ ] PWA support
- [ ] Home Assistant integration
- [ ] Voice control (Alexa/Google)

## 📄 License

MIT

## 👨‍💻 Author

Home IoT System Project
