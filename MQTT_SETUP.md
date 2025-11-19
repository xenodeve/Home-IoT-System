# MQTT Setup Guide

## ภาพรวม

ระบบ MQTT ช่วยให้คุณควบคุม IoT device จากภายนอก LAN ผ่าน MQTT broker สามารถใช้ broker สาธารณะหรือติดตั้งเองได้

## MQTT Architecture

```
[Mobile/External Client]
         |
         v
   [MQTT Broker] (HiveMQ, Mosquitto, etc.)
         |
    +----+----+
    |         |
    v         v
[Backend]  [Pico W]
```

## MQTT Topics

- **`home-iot/relay/control`** - ส่งคำสั่งควบคุมรีเลย์
- **`home-iot/relay/status`** - รับสถานะรีเลย์
- **`home-iot/system/status`** - สถานะระบบ backend
- **`home-iot/device/status`** - สถานะ Pico W device

## ตัวเลือก MQTT Broker

### 1. Public Brokers (ทดสอบ)

**HiveMQ Public Broker:**
```
Broker: broker.hivemq.com
Port: 1883 (MQTT), 8883 (MQTT over TLS)
```

**Mosquitto Test Server:**
```
Broker: test.mosquitto.org
Port: 1883
```

**⚠️ ข้อควรระวัง:** Broker สาธารณะไม่มีความปลอดภัย ใครก็เชื่อมต่อได้

### 2. Self-Hosted Mosquitto (แนะนำ)

#### ติดตั้งบน Raspberry Pi/Linux:

```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```

#### ตั้งค่า Authentication:

```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd username
```

แก้ไข `/etc/mosquitto/mosquitto.conf`:
```
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
```

Restart:
```bash
sudo systemctl restart mosquitto
```

### 3. Cloud MQTT Brokers

- **HiveMQ Cloud** - Free tier available
- **CloudMQTT** - Managed service
- **AWS IoT Core** - Enterprise grade

## การตั้งค่า Backend

### 1. แก้ไข `.env`:

```env
# Enable MQTT
MQTT_ENABLED=true

# Broker settings
MQTT_BROKER=mqtt://broker.hivemq.com
MQTT_PORT=1883

# Authentication (optional)
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password

# Client ID (unique per device)
MQTT_CLIENT_ID=home-iot-backend
```

### 2. ติดตั้ง Dependencies:

```cmd
cd backend
npm install
```

### 3. รัน Backend:

```cmd
npm start
```

คุณจะเห็น:
```
🌐 MQTT ENABLED - Connecting to broker at mqtt://broker.hivemq.com
📡 MQTT Connected to broker: mqtt://broker.hivemq.com
📨 Subscribed to: home-iot/relay/control
```

## การตั้งค่า Pico W

### 1. ติดตั้ง Library

ดาวน์โหลด `adafruit_minimqtt` library:
- ไปที่: https://circuitpython.org/libraries
- ดาวน์โหลด Bundle
- คัดลอก `adafruit_minimqtt/` ไปยัง `lib/` บน Pico W

### 2. ใช้ `code_mqtt.py`

เปลี่ยนชื่อ `code_mqtt.py` เป็น `code.py` บน Pico W

### 3. แก้ไข `settings.toml`:

```toml
CIRCUITPY_WIFI_SSID = "Your_WiFi"
CIRCUITPY_WIFI_PASSWORD = "Your_Password"

# MQTT Settings
MQTT_ENABLED = "true"
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = "1883"
MQTT_USERNAME = ""
MQTT_PASSWORD = ""
```

### 4. Restart Pico W

จะเห็น log:
```
Connecting to MQTT broker: broker.hivemq.com
Subscribed to: home-iot/relay/control
MQTT connected successfully
```

## การทดสอบ MQTT

### ใช้ MQTT Explorer (GUI)

1. ดาวน์โหลด: http://mqtt-explorer.com/
2. เชื่อมต่อกับ broker
3. Subscribe topics: `home-iot/#`
4. Publish message:
   - Topic: `home-iot/relay/control`
   - Payload: `{"state": "on"}`

### ใช้ mosquitto_pub/sub (CLI)

**Subscribe (รับ status):**
```bash
mosquitto_sub -h broker.hivemq.com -t "home-iot/relay/status"
```

**Publish (ส่งคำสั่ง):**
```bash
mosquitto_pub -h broker.hivemq.com -t "home-iot/relay/control" -m '{"state":"on"}'
mosquitto_pub -h broker.hivemq.com -t "home-iot/relay/control" -m '{"state":"off"}'
```

## การควบคุมจากภายนอก LAN

### 1. เปิด Port Forwarding (ถ้าใช้ self-hosted)

ในหน้า Router settings:
- Forward port 1883 → ไปยัง IP ของเครื่องที่รัน Mosquitto
- หรือใช้ VPN/Tailscale เพื่อความปลอดภัยสูงสุด

### 2. ใช้ Public Broker

ตั้งค่า backend และ Pico W ให้ชี้ไปยัง broker เดียวกัน จากนั้นควบคุมผ่าน mobile app

### 3. Mobile MQTT Apps

- **MQTT Dashboard** (Android/iOS)
- **IoT MQTT Panel** (Android)
- **MQTTool** (iOS)

ตั้งค่า connection:
```
Broker: broker.hivemq.com
Port: 1883
Subscribe: home-iot/relay/status
Publish to: home-iot/relay/control
Message: {"state": "on"} หรือ {"state": "off"}
```

## Message Formats

### Control Message (Publish to `home-iot/relay/control`):

```json
{
  "state": "on"
}
```

หรือ

```json
{
  "state": "off"
}
```

### Status Message (Subscribe to `home-iot/relay/status`):

```json
{
  "state": "on",
  "timestamp": "2025-11-19T...",
  "source": "backend"
}
```

## ความปลอดภัย

### แนะนำสำหรับ Production:

1. **ใช้ TLS/SSL:**
   ```
   MQTT_BROKER=mqtts://your-broker.com
   MQTT_PORT=8883
   ```

2. **ตั้ง Username/Password:**
   ```
   MQTT_USERNAME=secure_user
   MQTT_PASSWORD=strong_password_123
   ```

3. **จำกัด Topics ที่ user สามารถ pub/sub:**
   ```
   # mosquitto.conf
   acl_file /etc/mosquitto/acl
   ```

4. **ใช้ VPN/Tailscale** แทน port forwarding

5. **เปลี่ยน Topic prefix** จาก `home-iot/` เป็น unique ID

## Troubleshooting

### Backend ไม่เชื่อมต่อ MQTT:

1. ตรวจสอบ `MQTT_ENABLED=true` ใน `.env`
2. ตรวจสอบ broker URL ถูกต้อง
3. Ping broker: `ping broker.hivemq.com`
4. ลองใช้ public broker ก่อน

### Pico W ไม่เชื่อมต่อ MQTT:

1. ตรวจสอบว่าติดตั้ง `adafruit_minimqtt` library แล้ว
2. ดู serial console สำหรับ error messages
3. ตรวจสอบ `settings.toml` ใน Pico W
4. ลอง restart Pico W

### ไม่ได้รับ messages:

1. ตรวจสอบว่า subscribe topic ถูกต้อง
2. ใช้ MQTT Explorer ดูว่ามี message publish หรือไม่
3. ตรวจสอบ QoS level (ควรเป็น 1)

## Next Steps

1. ติดตั้ง Mosquitto บนเครื่องของคุณ
2. ตั้งค่า authentication
3. ทดสอบควบคุมจากมือถือ
4. เพิ่ม automation rules
5. เชื่อมต่อกับ Home Assistant หรือ Node-RED

## Resources

- MQTT Protocol: https://mqtt.org/
- Mosquitto: https://mosquitto.org/
- HiveMQ: https://www.hivemq.com/
- CircuitPython MQTT: https://learn.adafruit.com/mqtt-in-circuitpython
