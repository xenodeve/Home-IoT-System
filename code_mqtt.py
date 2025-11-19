"""
MQTT-enabled version for Pico W
Supports both HTTP API and MQTT for remote access outside LAN
"""
import os
import time
import wifi
import socketpool
import board
import microcontroller
import digitalio
from adafruit_httpserver.server import HTTPServer
from adafruit_httpserver.request import HTTPRequest
from adafruit_httpserver.response import HTTPResponse
from adafruit_httpserver.methods import HTTPMethod
from adafruit_httpserver.mime_type import MIMEType

# MQTT imports (requires adafruit_minimqtt library)
try:
    import adafruit_minimqtt.adafruit_minimqtt as MQTT
    MQTT_AVAILABLE = True
except ImportError:
    print("Warning: MQTT library not found. Install adafruit_minimqtt for MQTT support.")
    MQTT_AVAILABLE = False

# Relay setup
Relay8 = digitalio.DigitalInOut(board.GP14)
Relay8.direction = digitalio.Direction.OUTPUT
relay_state = False  # Track relay state

# Connect to network
print()
print("Connecting to WiFi")

wifi.radio.connect(os.getenv('CIRCUITPY_WIFI_SSID'), os.getenv('CIRCUITPY_WIFI_PASSWORD'))

print("Connected to WiFi")
print(f"IP Address: {wifi.radio.ipv4_address}")

pool = socketpool.SocketPool(wifi.radio)
server = HTTPServer(pool, "/static")

# MQTT Configuration
MQTT_BROKER = os.getenv('MQTT_BROKER', 'broker.hivemq.com')
MQTT_PORT = int(os.getenv('MQTT_PORT', '1883'))
MQTT_USERNAME = os.getenv('MQTT_USERNAME', '')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', '')
MQTT_ENABLED = os.getenv('MQTT_ENABLED', 'false').lower() == 'true'

TOPICS = {
    'CONTROL': 'home-iot/relay/control',
    'STATUS': 'home-iot/relay/status',
    'DEVICE': 'home-iot/device/status'
}

mqtt_client = None

def Relay_ON():
    global relay_state
    print("Relay: ON")
    Relay8.value = True
    relay_state = True
    publish_status('on')

def Relay_OFF():
    global relay_state
    print("Relay: OFF")
    Relay8.value = False
    relay_state = False
    publish_status('off')

def publish_status(state):
    """Publish relay status to MQTT"""
    if mqtt_client and MQTT_ENABLED:
        try:
            payload = f'{{"state": "{state}", "timestamp": "{time.monotonic()}", "source": "pico"}}'
            mqtt_client.publish(TOPICS['STATUS'], payload)
            print(f"Published MQTT: {state}")
        except Exception as e:
            print(f"MQTT publish error: {e}")

def mqtt_message_received(client, topic, message):
    """Callback when MQTT message is received"""
    print(f"MQTT Message: {topic} = {message}")
    
    if topic == TOPICS['CONTROL']:
        try:
            # Simple JSON parsing for CircuitPython
            if '"on"' in message or "'on'" in message:
                Relay_ON()
            elif '"off"' in message or "'off'" in message:
                Relay_OFF()
        except Exception as e:
            print(f"Error processing MQTT message: {e}")

# Setup MQTT if enabled and available
if MQTT_ENABLED and MQTT_AVAILABLE:
    try:
        mqtt_client = MQTT.MQTT(
            broker=MQTT_BROKER,
            port=MQTT_PORT,
            socket_pool=pool,
            ssl_context=None
        )
        
        if MQTT_USERNAME and MQTT_PASSWORD:
            mqtt_client.username = MQTT_USERNAME
            mqtt_client.password = MQTT_PASSWORD
        
        mqtt_client.on_message = mqtt_message_received
        
        print(f"Connecting to MQTT broker: {MQTT_BROKER}")
        mqtt_client.connect()
        
        # Subscribe to control topic
        mqtt_client.subscribe(TOPICS['CONTROL'])
        print(f"Subscribed to: {TOPICS['CONTROL']}")
        
        # Publish device online status
        mqtt_client.publish(TOPICS['DEVICE'], '{"online": true}', retain=True)
        
        print("MQTT connected successfully")
    except Exception as e:
        print(f"MQTT setup error: {e}")
        mqtt_client = None
else:
    print("MQTT disabled or not available")

# API endpoint to get relay status (JSON)
@server.route("/api/relay", method=HTTPMethod.GET)
def get_relay_status(request: HTTPRequest):
    with HTTPResponse(request, content_type=MIMEType.TYPE_JSON) as response:
        response.send('{"state": "' + ('on' if relay_state else 'off') + '", "success": true}')

# API endpoint to control relay (JSON)
@server.route("/api/relay", method=HTTPMethod.POST)
def control_relay(request: HTTPRequest):
    raw_text = request.raw_request.decode("utf8")
    
    if '"state"' in raw_text or "'state'" in raw_text:
        if '"on"' in raw_text or "'on'" in raw_text:
            Relay_ON()
            state = "on"
        elif '"off"' in raw_text or "'off'" in raw_text:
            Relay_OFF()
            state = "off"
        else:
            with HTTPResponse(request, content_type=MIMEType.TYPE_JSON) as response:
                response.send('{"error": "Invalid state", "success": false}')
                return
        
        with HTTPResponse(request, content_type=MIMEType.TYPE_JSON) as response:
            response.send('{"state": "' + state + '", "success": true}')
    else:
        with HTTPResponse(request, content_type=MIMEType.TYPE_JSON) as response:
            response.send('{"error": "Missing state parameter", "success": false}')

print("Starting server..")
# Startup the server
try:
    server.start(str(wifi.radio.ipv4_address))
    print("Listening on http://%s" % wifi.radio.ipv4_address)
except OSError:
    time.sleep(5)
    print("Restarting..")
    microcontroller.reset()

# Main loop
last_mqtt_check = time.monotonic()
MQTT_CHECK_INTERVAL = 1.0  # Check MQTT every 1 second

while True:
    try:
        # Poll HTTP server
        server.poll()
        
        # Poll MQTT client if enabled
        if mqtt_client and MQTT_ENABLED:
            current_time = time.monotonic()
            if current_time - last_mqtt_check >= MQTT_CHECK_INTERVAL:
                try:
                    mqtt_client.loop()
                    last_mqtt_check = current_time
                except Exception as e:
                    print(f"MQTT loop error: {e}")
                    # Try to reconnect
                    try:
                        mqtt_client.reconnect()
                    except Exception:
                        pass
        
    except Exception as e:
        print(f"Main loop error: {e}")
        continue
