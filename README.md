# Home IoT System

ระบบควบคุม IoT แบบเต็มรูปแบบด้วย Pico W (CircuitPython), Express.js Backend, React Frontend และ MQTT สำหรับควบคุมจากระยะไกล

## 📋 ภาพรวมโปรเจ็กต์

โปรเจ็กต์นี้ประกอบด้วย 3 ส่วนหลัก:

1. **Pico W (IoT Device)**: ควบคุมรีเลย์และเปิด REST API + MQTT พร้อม NTP time sync
2. **Express Backend**: Gateway API, MQTT client, scheduler service และ mock mode สำหรับทดสอบ
3. **React Frontend**: Professional dashboard UI พร้อม real-time updates, animated counter clock, และ scheduling interface

## 🏛️ System Architecture

### Same-LAN Deployment (Development/Local Network)
```
┌─────────────────────────────────────────────────────────────────┐
│                         Local Network (192.168.x.x)              │
│                                                                  │
│  ┌──────────────┐      HTTP API       ┌──────────────┐          │
│  │              │◄────────────────────►│              │          │
│  │   Pico W     │                      │   Backend    │          │
│  │ (code.py)    │                      │ (Express.js) │          │
│  │              │◄─────────────────────┤              │          │
│  │  GPIO14      │    MQTT (Optional)   │  Port 3001   │          │
│  │  Relay       │                      │              │          │
│  └──────────────┘                      └───────┬──────┘          │
│         ▲                                      │                 │
│         │                                      │ REST API        │
│         │                                      ▼                 │
│         │                              ┌──────────────┐          │
│         │                              │   Frontend   │          │
│         │                              │  (React +    │          │
│         └──────────Real-time───────────┤   Vite)      │          │
│                   Status Update        │  Port 3000   │          │
│                                        └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ MQTT WebSocket (Optional)
                           ▼
                  ┌─────────────────┐
                  │  Public MQTT     │
                  │    Broker        │
                  │ broker.hivemq.com│
                  └─────────────────┘
```

### Cross-LAN Deployment (Production/Remote Access)
```
┌────────────────────────┐                    ┌────────────────────────┐
│   Home Network         │                    │   Cloud/VPS/Internet   │
│   (192.168.1.x)        │                    │                        │
│                        │                    │                        │
│  ┌──────────────┐      │                    │  ┌──────────────┐      │
│  │   Pico W     │      │   MQTT Pub/Sub     │  │   Backend    │      │
│  │  (code.py)   │◄─────┼────────────────────┼─►│ (Express.js) │      │
│  │              │      │                    │  │              │      │
│  │  GPIO14      │      │                    │  │  MongoDB     │      │
│  │  Relay       │      │                    │  │  Atlas       │      │
│  └──────────────┘      │                    │  └───────┬──────┘      │
│         ▲              │                    │          │             │
│         │              │                    │          │ HTTPS API   │
│         │              │                    │          ▼             │
│         │              │                    │  ┌──────────────┐      │
│         │              │                    │  │   Frontend   │      │
│         │              │   MQTT WebSocket   │  │  (React +    │      │
│         └──────────────┼────────────────────┼──┤   Vite)      │      │
│            Real-time   │                    │  │              │      │
│            Status      │                    │  └──────────────┘      │
│                        │                    │                        │
└────────────────────────┘                    └────────────────────────┘
                 │                                      │
                 │           ┌─────────────────┐        │
                 └───────────►  Public MQTT     ◄───────┘
                             │    Broker        │
                             │ broker.hivemq.com│
                             │  Port: 1883 (TCP)│
                             │  Port: 8884 (WSS)│
                             └─────────────────┘
```

### Communication Flow
```
1. Control Command:
   User → Frontend (React) → Backend (Express) → MQTT Broker
                                                       ↓
                                              Pico W → Relay ON/OFF

2. Status Update (Real-time):
   Relay → Pico W → MQTT Broker → Frontend (WebSocket) → UI Update
                          ↓
                    Backend (Subscribe) → Database (Schedule Sync)

3. Scheduled Task:
   Scheduler (Backend) → Check Time → Execute → MQTT Broker → Pico W → Relay
```

### Technology Stack per Component
```
┌─────────────────────────────────────────────────────────────────────┐
│ Pico W Simulator (Python)                                           │
│ • Python 3.x                                                        │
│ • Flask (HTTP Server)                                               │
│ • paho-mqtt (MQTT Client - TCP port 1883)                           │
│ • ntplib (NTP Client - time.navy.mi.th)                             │
│ • threading (Concurrent HTTP + MQTT)                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Pico W (IoT Device)                                                 │
│ • CircuitPython 9.x                                                 │
│ • adafruit_httpserver (REST API)                                    │
│ • adafruit_minimqtt (MQTT Client - TCP port 1883)                  │
│ • NTP Client (time.navy.mi.th)                                      │
│ • GPIO Control (digitalio)                                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Backend (Express.js)                                                │
│ • Node.js + Express 4                                               │
│ • MQTT.js (TCP Client - port 1883)                                  │
│ • Mongoose (MongoDB Atlas)                                          │
│ • Luxon (Timezone handling)                                         │
│ • Axios (HTTP Client)                                               │
│ • node-cron (Scheduler - every 10s)                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Frontend (React)                                                    │
│ • React 18 + Vite 6                                                 │
│ • MQTT.js (WebSocket Client - port 8884)                            │
│ • GSAP 3.13 (Animations)                                            │
│ • Axios (REST API)                                                  │
│ • Custom Components (MagicBento, AnimatedSelect, Dropdowns)         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Infrastructure                                                      │
│ • MQTT Broker: HiveMQ Public (broker.hivemq.com)                    │
│ • Database: MongoDB Atlas (Cloud)                                   │
│ • Time Service: worldtimeapi.org / Thai Navy NTP                    │
└─────────────────────────────────────────────────────────────────────┘
```

## 🏗️ โครงสร้างโปรเจ็กต์

```
Home-IoT-System/
├── code.py                    # CircuitPython สำหรับ Pico W (HTTP + MQTT + NTP sync)
├── pico_simulator.py         # Python simulator สำหรับทดสอบ Pico W โดยไม่ต้องมีฮาร์ดแวร์จริง
├── requirements_simulator.txt # Dependencies สำหรับ Pico W simulator
├── settings.toml              # WiFi + MQTT config สำหรับ Pico W
├── test_ntp.py                # ทดสอบ NTP time sync
├── MQTT_SETUP.md              # คู่มือการตั้งค่า MQTT
├── backend/                   # Express.js backend
│   ├── server.js              # Express server + MQTT + Scheduler
│   ├── models/                # Mongoose models (Schedule)
│   │   └── Schedule.js        # โมเดลกำหนดการสำหรับ MongoDB
│   ├── services/              # Time service (multi-provider NTP) + scheduler loop
│   │   ├── fileStorage.js     # ที่เก็บข้อมูล JSON สำรองสำหรับการพัฒนา
│   │   ├── mongoStorage.js    # บูรณาการ MongoDB สำหรับการใช้งานจริง
│   │   ├── scheduler.js       # ลูปการทำงานอัตโนมัติของตัวกำหนดเวลา
│   │   └── timeService.js     # การซิงค์เวลา NTP/HTTP หลายผู้ให้บริการ (Thai Navy เป็นหลัก)
│   ├── data/                  # ที่เก็บไฟล์ JSON (fallback)
│   │   └── schedules.json     # ที่เก็บกำหนดการในเครื่อง
│   ├── package.json
│   ├── .env.example           # ตัวอย่างการตั้งค่า environment variables
│   └── README.md
├── frontend/                  # React frontend
│   ├── index.html             # จุดเริ่มต้น HTML
│   ├── src/
│   │   ├── App.jsx            # Professional dashboard + scheduler UI
│   │   ├── App.css            # Modern dark theme styling
│   │   ├── main.jsx           # จุดเริ่มต้น
│   │   ├── index.css          # สไตล์ส่วนกลาง
│   │   └── components/
│   │       ├── Counter.jsx    # นาฬิกานับแบบหมุนเคลื่อนไหว (GSAP)
│   │       ├── MagicBento.jsx # ระบบการ์ดแบบโต้ตอบพร้อมเอฟเฟกต์
│   │       ├── MagicBento.css # สไตล์สำหรับเอฟเฟกต์อนุภาคและขอบเรืองแสง
│   │       ├── AnimatedSelect.jsx    # ดรอปดาวน์เลือกแบบกำหนดเองพร้อมแอนิเมชันหมุน X
│   │       ├── AnimatedSelect.css    # สไตล์ดรอปดาวน์เลือก
│   │       ├── DateDropdown.jsx      # เครื่องมือเลือกวันที่แบบกำหนดเองพร้อมปฏิทิน
│   │       ├── DateDropdown.css      # สไตล์เครื่องมือเลือกวันที่
│   │       ├── TimeDropdown.jsx      # เครื่องมือเลือกเวลาแบบกำหนดเอง (รูปแบบ 24 ชั่วโมง)
│   │       └── TimeDropdown.css      # สไตล์เครื่องมือเลือกเวลา
│   ├── config/
│   │   ├── config.js          # การตั้งค่าที่รวมศูนย์ (ช่วงเวลา, โซนเวลา, API)
│   │   └── mqttConfig.js      # การตั้งค่า MQTT WebSocket
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example           # ตัวอย่างการตั้งค่า environment variables (Cross-LAN)
│   └── README.md
└── lib/                       # Adafruit libraries สำหรับ Pico W
    └── adafruit_httpserver/   # HTTP server library
        ├── __init__.mpy
        ├── authentication.mpy
        ├── exceptions.mpy
        ├── headers.mpy
        ├── methods.mpy
        ├── mime_type.mpy
        ├── mime_types.mpy
        ├── README.md
        ├── request.mpy
        ├── response.mpy
        ├── route.mpy
        ├── server.mpy
        └── status.mpy
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

> ℹ️ **Scheduling Dashboard** จำเป็นต้องตั้งค่า `MONGODB_URI` (เช่น MongoDB Atlas) และเปิดให้ backend เข้าถึง พร้อมกำหนด `TIMEZONE`/`TIME_API_URL` หากต้องการใช้ผู้ให้บริการเวลาภายนอกอื่น ๆ

คุณจะเห็น:
```
🌐 MQTT ENABLED - Connecting to broker
📡 MQTT Connected to broker
```

#### 2. เริ่ม Pico W Simulator (แทน Pico W จริง)

```cmd
pip install -r requirements_simulator.txt
```

ตั้งค่า environment variables (เหมือน settings.toml):
```cmd
# Windows
set MQTT_ENABLED=true
set MQTT_BROKER=broker.hivemq.com
set MQTT_PORT=1883

# Linux/Mac
export MQTT_ENABLED=true
export MQTT_BROKER=broker.hivemq.com
export MQTT_PORT=1883
```

รัน simulator:
```cmd
python pico_simulator.py
```

คุณจะเห็น:
```
🚀 Starting Pico W Simulator...
🕒 Attempting to sync time with NTP server: time.navy.mi.th
✅ Time synced successfully!
📡 MQTT Connected to broker: broker.hivemq.com
📨 Subscribed to: home-iot/relay/control
🌐 Starting HTTP server on http://localhost:5000
✅ Pico W Simulator is running!
📡 HTTP API: http://localhost:5000/api/relay
🌐 Web Interface: http://localhost:5000
```

#### 3. เริ่ม Frontend

```cmd
cd frontend
npm install
npm run dev
```

เปิดบราวเซอร์ที่ `http://localhost:3000`

คุณจะเห็น badge:
- ✨ **Real-time ON** (สีเขียว) - MQTT WebSocket เชื่อมต่อแล้ว
- 🌐 **Backend MQTT** (สีเขียว) - Backend เชื่อมต่อ MQTT broker

#### 4. ทดสอบการทำงาน

**ทดสอบผ่าน Web Interface:**
- เปิด `http://localhost:5000` ในบราวเซอร์
- กดปุ่ม ON/OFF เพื่อควบคุม relay จำลอง

**ทดสอบผ่าน API:**
```bash
# ดูสถานะ
curl http://localhost:5000/api/relay

# เปิด relay
curl -X POST http://localhost:5000/api/relay -H "Content-Type: application/json" -d '{"state": "on"}'

# ปิด relay
curl -X POST http://localhost:5000/api/relay -H "Content-Type: application/json" -d '{"state": "off"}'
```

**ทดสอบ Real-time Sync:**
เปิดหลายแท็บ Frontend แล้วลองควบคุม relay - **ทุกแท็บจะอัพเดทพร้อมกันทันที!** ⚡

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
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/home-iot
TIMEZONE=Asia/Bangkok
TIME_API_URL=https://worldtimeapi.org/api
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
GET  /api/time/now            - เวลาปัจจุบันจาก third-party time server
GET  /api/schedules           - ดึงรายการกำหนดการทั้งหมด
POST /api/schedules           - สร้างกำหนดการใหม่ { action, executeAt, timezone }
PATCH /api/schedules/:id/cancel - ยกเลิกกำหนดการที่รอดำเนินการ
DELETE /api/schedules/:id     - ลบกำหนดการออกจากระบบ
```

### Pico W API (CircuitPython)

```
GET  /api/relay               - ดูสถานะรีเลย์ (JSON)
POST /api/relay               - ควบคุมรีเลย์ (JSON)
GET  /                        - หน้าเว็บควบคุมแบบเดิม
```

### ⏱️ Scheduling Flow

1. Frontend dashboard ส่งคำขอสร้างกำหนดการไปยัง `/api/schedules`
2. Backend บันทึกข้อมูลลง MongoDB Atlas ผ่าน Mongoose (`Schedule` model)
3. Scheduler service ดึงเวลาปัจจุบันจาก `worldtimeapi.org` (หรือ service อื่นตาม `TIME_API_URL`)
4. เมื่อถึงเวลาที่กำหนด ระบบจะส่งคำสั่งควบคุมรีเลย์อัตโนมัติ พร้อม publish สถานะผ่าน MQTT ให้ทุก client รับรู้

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

### Frontend (React + Vite)
- ✅ **Modern Professional Dashboard** - Dark theme พร้อม gradient effects
- ✅ **Magic Bento Grid System** - เอฟเฟกต์การ์ดแบบโต้ตอบพร้อมอนุภาค, สปอตไลท์, ขอบเรืองแสง, แม่เหล็ก และคลิก ripples
- ✅ **Animated Rolling Counter Clock** - แสดงเวลาแบบ real-time ด้วย GSAP
- ✅ **Animated Light Bulb Indicator** - หลอดไฟ 3D ขนาดใหญ่ที่เรืองแสงเมื่อรีเลย์เปิด (ขยาย 40%)
- ✅ **Custom Toggle Switch** - ปุ่มสไลด์แบบ iOS-style สำหรับควบคุมรีเลย์
- ✅ **Real-time MQTT Sync** - อัปเดตสถานะทันทีผ่าน WebSocket
- ✅ **Smart Scheduling UI** - สร้างและจัดการกำหนดการเปิด-ปิดอัตโนมัติพร้อม form ที่สวยงาม
- ✅ **Status Indicators** - แสดงสถานะการเชื่อมต่อ MQTT, Backend, Pico W แบบ real-time
- ✅ **Multi-device Sync** - ควบคุมจากหลายอุปกรณ์พร้อมกัน
- ✅ **Thai Localization** - ภาษาไทยทั้งระบบ พร้อม IBM Plex Sans Thai font
- ✅ **Smooth Transitions** - Animation และ transition ทุกองค์ประกอบด้วย GSAP hardware acceleration
- ✅ **Optimistic UI Updates** - อัปเดต UI ทันทีพร้อม rollback เมื่อเกิด error
- ✅ **Centralized Config** - จัดการ intervals และ settings ที่ `config.js`
- ✅ **Mobile Optimized** - ปิด animations อัตโนมัติบนหน้าจอเล็กกว่า 768px
- ✅ **Responsive Design** - รองรับทุกขนาดหน้าจอ

### Backend (Express.js + Node.js)
- ✅ **Multi-provider Time Service** - ดึงเวลาจาก Thai Navy NTP (primary) + HTTP fallbacks
- ✅ **No Cache Time API** - เวลาแม่นยำ real-time ไม่มี cache
- ✅ **Smart Scheduler** - ตรวจสอบและรันกำหนดการอัตโนมัติ
- ✅ **Dual Storage Support** - MongoDB (production) + JSON file (development)
- ✅ **MQTT-first Relay Control** - ส่งคำสั่งผ่าน MQTT ก่อน fallback เป็น HTTP
- ✅ **Connection Status Tracking** - ตรวจสอบและรายงานสถานะ Pico W
- ✅ **Provider Failure Tracking** - จำผู้ให้บริการที่ล้มเหลวและ skip ชั่วคราว
- ✅ **Health Check API** - แสดงสถานะระบบทั้งหมด
- ✅ **CORS & Auto-reconnect** - รองรับ cross-origin และเชื่อมต่อ MQTT อัตโนมัติ
- ✅ **Mock Mode** - ทดสอบโดยไม่ต้องมี Pico W จริง

### Pico W (CircuitPython)
- ✅ **NTP Time Sync** - ดึงเวลาจาก Thai Navy NTP server พร้อม UTC+7 offset
- ✅ **RTC Integration** - ใช้ Real-time Clock chip บน Pico W
- ✅ **WiFi Connectivity** - เชื่อมต่อ WiFi อัตโนมัติ
- ✅ **HTTP Server** - REST API สำหรับควบคุมรีเลย์
- ✅ **MQTT Client** - รับ-ส่งคำสั่งผ่าน MQTT (optional)
- ✅ **Auto-detect & Fallback** - ตรวจสอบ MQTT library และ gracefully fallback เป็น HTTP-only
- ✅ **Relay Control** - ควบคุมรีเลย์ผ่าน GPIO14
- ✅ **Error Recovery** - Auto-restart เมื่อเกิด error ร้ายแรง

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

### Option 4: Cross-LAN Deployment (Pico W อยู่บ้าน, Backend+Frontend อยู่ Cloud)

**ระบบรองรับ Cross-LAN แล้ว!** คุณสามารถควบคุม Pico W ที่บ้านจาก Backend+Frontend ที่อยู่บน Cloud/VPS ได้

#### การตั้งค่า:

**1. Pico W (บ้าน):**
```toml
# settings.toml
MQTT_ENABLED = "true"
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = "1883"
```

**2. Backend (Cloud/VPS):**
```env
# .env
MQTT_ENABLED=true
MQTT_BROKER=mqtt://broker.hivemq.com
MQTT_PORT=1883
MONGODB_URI=mongodb+srv://your-atlas-cluster
```

**3. Frontend (Cloud/VPS):**
```env
# .env
VITE_API_BASE=https://your-backend-domain.com/api
```

#### การสื่อสาร:
```
Pico W (บ้าน) ←→ MQTT Broker (Internet) ←→ Backend (Cloud)
                                             ↑
                                        Frontend (Cloud)
```

#### ข้อควรระวัง (Security):
- ปัจจุบันใช้ Public MQTT Broker (broker.hivemq.com) ที่ไม่มี authentication
- สำหรับ Production แนะนำใช้:
  - HiveMQ Cloud (มี free tier) + username/password
  - หรือติดตั้ง Mosquitto บน VPS ของคุณเอง พร้อม SSL/TLS

#### ดูรายละเอียดเพิ่มเติม:
- [MQTT_SETUP.md](MQTT_SETUP.md) - คู่มือการตั้งค่า MQTT broker และทดสอบ

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite 6** - การพัฒนาที่รวดเร็วด้วย HMR และการ build ที่ปรับให้เหมาะสม
- **GSAP 3.13** - ไลบรารีแอนิเมชันระดับมืออาชีพสำหรับเอฟเฟกต์ Counter และ Magic Bento พร้อม hardware acceleration
- **MQTT.js** - การเชื่อมต่อ WebSocket สำหรับการอัปเดตแบบ real-time
- **Axios** - HTTP client สำหรับคำขอ API
- **CSS3** - ธีมมืดแบบกำหนดเองพร้อม gradients, shadows, animations และเอฟเฟกต์แบบโต้ตอบ
- **IBM Plex Sans Thai** - ฟอนต์ไทยระดับมืออาชีพสำหรับ UI ทั้งหมด
- **Magic Bento Components** - ระบบการ์ดแบบโต้ตอบที่นำกลับมาใช้ใหม่ได้ พร้อมอนุภาค, สปอตไลท์, ขอบเรืองแสง, แม่เหล็ก และคลิก ripples

### Backend
- **Express.js 4** + **Node.js** - RESTful API server
- **Axios** - HTTP client สำหรับ time APIs และการสื่อสารกับ Pico W
- **MQTT.js** - TCP broker client สำหรับ pub/sub messaging
- **Mongoose** - บูรณาการ MongoDB Atlas สำหรับกำหนดการ
- **Luxon** - การแปลงโซนเวลาและการจัดการวันที่
- **node-cron** - ลูปตัวกำหนดเวลา (ทุก 10 วินาที)
- **dgram** (Node.js UDP) - โปรโตคอล NTP สำหรับ Thai Navy time server

### Pico W (CircuitPython)
- **CircuitPython 9.x** - Python สมัยใหม่สำหรับไมโครคอนโทรลเลอร์
- **adafruit_httpserver** - HTTP server น้ำหนักเบา
- **adafruit_ntp** - Network Time Protocol client
- **socketpool** + **wifi** - การเชื่อมต่อเครือข่าย
- **rtc** - บูรณาการ Real-time Clock chip
- **adafruit_minimqtt** (optional) - MQTT client พร้อม auto-fallback
- **digitalio** - การควบคุม GPIO สำหรับรีเลย์ (GP14)

### Infrastructure
- **MongoDB Atlas** - ฐานข้อมูลคลาวด์สำหรับการจัดเก็บกำหนดการ
- **HiveMQ** (Public) / **Mosquitto** (Self-hosted) - MQTT brokers
- **Hardware**: โมดูลรีเลย์ (GPIO14)
- **Protocol**: HTTP REST API + MQTT (TCP/WebSocket)
- **Time Source**: worldtimeapi.org (ปรับแต่งได้ผ่าน `TIME_API_URL`)

## 📚 Documentation

ดูรายละเอียดเพิ่มเติมใน:
- `code.py` - CircuitPython สำหรับ Pico W (HTTP + MQTT + NTP sync)
- `pico_simulator.py` - Python simulator สำหรับทดสอบ Pico W โดยไม่ต้องมีฮาร์ดแวร์จริง
- `requirements_simulator.txt` - Dependencies สำหรับ Pico W simulator
- `settings.toml` - WiFi + MQTT config สำหรับ Pico W
- [Backend README](backend/README.md) - Express server + การตั้งค่า MQTT
- `backend/models/Schedule.js` - โครงสร้างกำหนดการบน MongoDB
- `backend/services/timeService.js` - การซิงค์เวลา NTP/HTTP หลายผู้ให้บริการ (Thai Navy เป็นหลัก)
- `backend/services/scheduler.js` - ลูปการทำงานอัตโนมัติของตัวกำหนดเวลา
- `backend/services/fileStorage.js` - ที่เก็บข้อมูล JSON สำรองสำหรับการพัฒนา
- `backend/services/mongoStorage.js` - บูรณาการ MongoDB สำหรับการใช้งานจริง
- [Frontend README](frontend/README.md) - React app + WebSocket MQTT
- `frontend/src/config.js` - การตั้งค่าที่รวมศูนย์ (ช่วงเวลา, โซนเวลา, API base)
- `frontend/src/components/Counter.jsx` - นาฬิกานับแบบหมุนเคลื่อนไหวด้วย GSAP
- `frontend/src/components/MagicBento.jsx` - ระบบการ์ด Magic Bento พร้อมเอฟเฟกต์แบบโต้ตอบ
- `frontend/src/components/MagicBento.css` - สไตล์สำหรับเอฟเฟกต์อนุภาคและขอบเรืองแสง
- `frontend/src/App.jsx` - ตรรกะแดชบอร์ดหลัก (ควบคุมรีเลย์, การกำหนดเวลา, อัปเดตแบบ real-time)
- `frontend/src/App.css` - สไตล์ธีมมืดสมัยใหม่ (แอนิเมชันหลอดไฟใหญ่ขึ้น 40%, ปุ่มสลับ, ขอบสถานะ, สไตล์ฟอร์ม)
- [MQTT Setup Guide](MQTT_SETUP.md) - คู่มือการตั้งค่า MQTT broker และทดสอบ
- `test_ntp.py` - Python script สำหรับทดสอบ NTP time sync

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

### Scheduling ไม่ทำงาน / ปุ่มตั้งเวลาเป็นสีเทา
- ตรวจสอบว่า backend มีค่า `MONGODB_URI` และเชื่อมต่อ Atlas สำเร็จ (`health.database.connected` ต้องเป็น true)
- เปิด IP allowlist ของ MongoDB Atlas ให้ครอบคลุมเครื่อง backend
- ตรวจสอบ log ว่ามีข้อความ `Scheduler started`
- ตรวจสอบว่า `TIME_API_URL` เข้าถึงได้ (backend จะ fallback เป็น system clock หากล้มเหลว)

### Counter Animation ไม่ทำงาน
- ตรวจสอบว่าติดตั้ง GSAP: `cd frontend && npm list gsap`
- ลอง reinstall: `npm install gsap@latest`
- ตรวจสอบ browser console หา errors จาก Counter component
- GSAP จะใช้ hardware acceleration โดยอัตโนมัติ

### Magic Bento Effects ไม่ทำงาน
- ตรวจสอบว่าติดตั้ง GSAP: `npm list gsap` (ต้องเป็น 3.13.0 ขึ้นไป)
- Effects จะถูกปิดอัตโนมัติบนหน้าจอเล็กกว่า 768px (mobile)
- ตรวจสอบ browser console หา errors จาก MagicBento components
- ลด `particleCount` prop หากเห็นว่าช้า (default: 8-12 particles)
- ปรับ `magnetismStrength` (default: 0.05 สำหรับ card เล็ก, 0.015 สำหรับ card ใหญ่)
- ปรับ `clickEffectScale` (default: 1 สำหรับ card เล็ก, 0.4 สำหรับ card ใหญ่)

### เวลาไม่ตรง / Time Sync ล้มเหลว
- **การ fallback หลายผู้ให้บริการ:** TimeService จะลองตามลำดับ:
  1. Thai Navy NTP (`navy.ntppool.in.th:123` UDP)
  2. HTTP Time Header (`https://www.google.com`)
  3. WorldTimeAPI (`https://worldtimeapi.org/api/timezone/Asia/Bangkok`)
  4. System Clock (last resort)
- ตรวจสอบ network connectivity: `ping navy.ntppool.in.th`
- ดู backend logs - จะบอกว่าใช้ provider ไหนสำเร็จ
- หากทุก provider ล้มเหลว จะใช้ system clock พร้อมแจ้งเตือน
- ปรับ sync interval ได้ที่ `frontend/src/config.js` (`TIME_SYNC_INTERVAL`)

### Configuration ไม่มีผล / Intervals ไม่ทำงาน
- ตรวจสอบว่า import จาก `./config` หรือ `../config/config.js` ถูกต้อง
- Restart Vite dev server: `Ctrl+C` แล้ว `npm run dev`
- ตรวจสอบ `APP_CONFIG` values ใน browser console: `console.log(APP_CONFIG)`
- **การตั้งค่าที่มีอยู่:**
  - `TIME_SYNC_INTERVAL` - ความถี่ sync เวลากับ backend (default: 30000ms / 30s)
  - `SCHEDULE_FETCH_INTERVAL` - ความถี่ดึงรายการกำหนดการ (default: 30000ms)
  - `CLOCK_UPDATE_INTERVAL` - ความถี่อัปเดตนาฬิกาหน้าจอ (default: 1000ms / 1s)

## 🎯 ขั้นตอนถัดไป

- [x] ✅ เพิ่ม MQTT สำหรับ remote access
- [x] ✅ Real-time sync ผ่าน WebSocket
- [ ] เพิ่ม authentication (JWT/OAuth)
- [ ] ติดตั้ง Mosquitto broker แบบ self-hosted
- [ ] รองรับรีเลย์หลายช่อง
- [x] เพิ่มการตั้งเวลา (scheduling)
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
