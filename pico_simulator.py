"""
Pico W Simulator - จำลองการทำงานของ Pico W บน Python ปกติ
ใช้สำหรับทดสอบและพัฒนาโดยไม่ต้องมี Pico W จริง

ฟีเจอร์:
- HTTP API server (Flask)
- MQTT client (paho-mqtt)
- NTP time sync
- Relay state simulation
- Auto-fallback จาก MQTT เป็น HTTP-only
"""

import os
import time
import json
import threading
from datetime import datetime
import ntplib
import requests
from flask import Flask, request, jsonify
import paho.mqtt.client as mqtt

# Configuration - อ่านจาก environment variables เหมือน code.py
MQTT_BROKER = os.getenv('MQTT_BROKER', 'broker.hivemq.com')
MQTT_PORT = int(os.getenv('MQTT_PORT', '1883'))
MQTT_USERNAME = os.getenv('MQTT_USERNAME', '')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', '')
# Default เป็น true เพื่อให้ทำงานร่วมกับ Backend ผ่าน MQTT
MQTT_ENABLED = os.getenv('MQTT_ENABLED', 'true').lower() == 'true'

TOPICS = {
    'CONTROL': 'home-iot/relay/control',
    'STATUS': 'home-iot/relay/status',
    'DEVICE': 'home-iot/device/status'
}

# Global state
relay_state = False
mqtt_client = None
mqtt_connected = False

# Flask app
app = Flask(__name__)

# NTP Time Sync (จำลองจาก code.py)
def sync_time_with_ntp(host="time.navy.mi.th"):
    """Sync time with NTP server (Thai Navy)"""
    try:
        print(f"🕒 Attempting to sync time with NTP server: {host}")

        client = ntplib.NTPClient()
        response = client.request(host, timeout=5)

        # Set system time (จำลอง)
        current_time = datetime.fromtimestamp(response.tx_time)
        print("✅ Time synced successfully!")
        print(f"📅 Current device time: {current_time.strftime('%d/%m/%Y %H:%M:%S')}")

        return True
    except Exception as e:
        print(f"❌ NTP connection error: {e}")
        return False

# Relay Control Functions (จำลอง GPIO)
def Relay_ON():
    """Turn relay ON"""
    global relay_state
    print("🔴 Relay: ON")
    relay_state = True
    publish_status('on')

def Relay_OFF():
    """Turn relay OFF"""
    global relay_state
    print("⚫ Relay: OFF")
    relay_state = False
    publish_status('off')

def publish_status(state):
    """Publish relay status to MQTT (if available)"""
    if mqtt_client and mqtt_connected and MQTT_ENABLED:
        try:
            payload = {
                "state": state,
                "timestamp": time.time(),
                "source": "pico-simulator"
            }
            mqtt_client.publish(TOPICS['STATUS'], json.dumps(payload))
            print(f"✅ MQTT status published: {state} → {TOPICS['STATUS']}")
        except Exception as e:
            print(f"⚠ MQTT publish error: {e}")
    else:
        print(f"⚠️ Cannot publish status: mqtt_client={mqtt_client is not None}, connected={mqtt_connected}, enabled={MQTT_ENABLED}")

# MQTT Functions
def on_mqtt_connect(client, userdata, flags, rc):
    """MQTT connection callback"""
    global mqtt_connected
    if rc == 0:
        mqtt_connected = True
        print(f"📡 MQTT Connected to broker: {MQTT_BROKER}")
        client.subscribe(TOPICS['CONTROL'])
        client.publish(TOPICS['DEVICE'], json.dumps({"online": True}), retain=True)
        print(f"📨 Subscribed to: {TOPICS['CONTROL']}")
    else:
        print(f"❌ MQTT Connection failed: {rc}")

def on_mqtt_disconnect(client, userdata, rc):
    """MQTT disconnection callback"""
    global mqtt_connected
    mqtt_connected = False
    print("📡 MQTT Disconnected")

def on_mqtt_message(client, userdata, msg):
    """MQTT message callback"""
    print(f"📨 MQTT Message received: {msg.topic} = {msg.payload.decode()}")

    if msg.topic == TOPICS['CONTROL']:
        try:
            payload = json.loads(msg.payload.decode())
            
            # Debug: แสดง payload ที่ได้รับ
            print(f"📦 Parsed payload: {payload}")
            
            command = payload.get('state') or payload.get('command')
            
            print(f"🎯 Command extracted: {command}")

            if command == 'on':
                Relay_ON()
            elif command == 'off':
                Relay_OFF()
            else:
                print(f"⚠️ Unknown command: {command}")
        except Exception as e:
            print(f"⚠ Error processing MQTT: {e}")
            import traceback
            traceback.print_exc()

def setup_mqtt():
    """Setup MQTT client"""
    global mqtt_client

    if not MQTT_ENABLED:
        print("→ Running in HTTP-only mode")
        return

    try:
        mqtt_client = mqtt.Client(client_id=f"pico-simulator-{int(time.time())}")
        mqtt_client.on_connect = on_mqtt_connect
        mqtt_client.on_disconnect = on_mqtt_disconnect
        mqtt_client.on_message = on_mqtt_message

        if MQTT_USERNAME and MQTT_PASSWORD:
            mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

        print(f"Connecting to MQTT broker: {MQTT_BROKER}:{MQTT_PORT}")
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()

    except Exception as e:
        print(f"⚠ MQTT setup failed: {e}")
        print("→ Falling back to HTTP-only mode")
        mqtt_client = None

# Flask Routes (จำลอง HTTP API จาก code.py)
@app.route('/api/relay', methods=['GET'])
def get_relay_status():
    """Get relay status"""
    return jsonify({
        'state': 'on' if relay_state else 'off',
        'success': True
    })

@app.route('/api/relay', methods=['POST'])
def control_relay():
    """Control relay"""
    try:
        data = request.get_json()
        state = data.get('state')

        print(f"🌐 HTTP API request: {state}")

        if state == 'on':
            Relay_ON()
            return jsonify({'state': 'on', 'success': True})
        elif state == 'off':
            Relay_OFF()
            return jsonify({'state': 'off', 'success': True})
        else:
            return jsonify({'error': 'Invalid state', 'success': False}), 400

    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 400

@app.route('/')
def index():
    """Simple web interface"""
    return f"""
    <html>
    <head><title>Pico W Simulator</title></head>
    <body>
        <h1>Pico W Simulator</h1>
        <p>Relay State: <strong>{'ON' if relay_state else 'OFF'}</strong></p>
        <p>MQTT: <strong>{'Connected' if mqtt_connected else 'Disconnected'}</strong></p>
        <p>Time: <strong>{datetime.now().strftime('%H:%M:%S')}</strong></p>
        <button onclick="control('on')">Turn ON</button>
        <button onclick="control('off')">Turn OFF</button>
        <script>
            function control(state) {{
                fetch('/api/relay', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{state: state}})
                }}).then(() => location.reload());
            }}
        </script>
    </body>
    </html>
    """

# Main function
def main():
    print("🚀 Starting Pico W Simulator...")

    # Sync time
    sync_time_with_ntp()

    # Setup MQTT
    setup_mqtt()

    # Start Flask server in a separate thread
    def run_flask():
        print("🌐 Starting HTTP server on http://localhost:5000")
        # ปิด debug mode เพื่อหลีกเลี่ยง conflict กับ code.py
        app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    print("✅ Pico W Simulator is running!")
    print("📡 HTTP API: http://localhost:5000/api/relay")
    print("🌐 Web Interface: http://localhost:5000")
    if MQTT_ENABLED:
        print(f"📡 MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
        print(f"📨 Topics: {TOPICS}")

    # Main loop
    try:
        while True:
            time.sleep(1)  # Keep alive
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        if mqtt_client:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()

if __name__ == "__main__":
    main()