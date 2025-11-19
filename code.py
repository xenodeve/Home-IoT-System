"""
COMPANY: Cytron Technologies Sdn Bhd
WEBSITE: www.cytron.io
EMAIL: support@cytron.io

REFERENCE:
Code adapted from 2023 Liz Clark for Adafruit Industries:
https://learn.adafruit.com/pico-w-http-server-with-circuitpython/code-the-pico-w-http-server
"""
import os
import time
import ipaddress
import wifi
import socketpool
import board
import microcontroller
import digitalio
from digitalio import DigitalInOut, Direction
from adafruit_httpserver.server import HTTPServer
from adafruit_httpserver.request import HTTPRequest
from adafruit_httpserver.response import HTTPResponse
from adafruit_httpserver.methods import HTTPMethod
from adafruit_httpserver.mime_type import MIMEType


# Relay setup
Relay8 = digitalio.DigitalInOut(board.GP14)
Relay8.direction = digitalio.Direction.OUTPUT

# connect to network
print()
print("Connecting to WiFi")


# connect to your SSID
wifi.radio.connect(os.getenv('CIRCUITPY_WIFI_SSID'), os.getenv('CIRCUITPY_WIFI_PASSWORD'))

print("Connected to WiFi")
pool = socketpool.SocketPool(wifi.radio)
server = HTTPServer(pool, "/static")


def Relay_ON():
    print("Button Pressed: ON")
    Relay8.value = True

def Realy_OFF():
    print("Button Pressed: OFF")
    Relay8.value = False
    

# the HTML script
def webpage():
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta http-equiv="Content-type" content="text/html;charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script>
    function buttonDown(button) {{
        // Send a POST request to tell the Pico that the button was pressed
        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", "/", true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send(button + "=true");
    }}
    function buttonUp() {{
        // Send a POST request to tell the Pico that the button was released (stop)
        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", "/", true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send("stop=true");
    }}
    </script>
    <style>
      h1 {{
        text-align: center;
      }}
      body {{
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 80vh;
        margin: 0;
      }}
      .controls {{
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }}
      .button-on {{
        font-size: 50px;
        display: flex;
        border-radius: 30px;   
        align-items: center;
        justify-content: center;
        background-color: green;
        color: black;
        padding: 30px;
        width: 80px;
        height: 70px;
      }}
      .button-off {{
        font-size: 50px;
        display: flex;
        border-radius: 30px;           
        align-items: center;
        justify-content: center;
        background-color: grey;
        color: black;
        padding: 30px;
        width: 80px;
        height: 70px;
      }}      
    </style>
    </head>
    <body>
<h1>Control Page</h1>
<center><b>
<div class="controls">      
    <div></div>
    <div class="button-on" id="ON_button" ontouchstart="buttonDown(this.id)" ontouchend="buttonUp()" 
    onmousedown="buttonDown(this.id)" onmouseup="buttonUp()">ON</div>
    <div></div>
    
    <div></div>
    <div class="button-off" id="OFF_button" ontouchstart="buttonDown(this.id)" ontouchend="buttonUp()" 
    onmousedown="buttonDown(this.id)" onmouseup="buttonUp()">OFF</div>
    <div></div>

    </div>
    </body></html>

    """
    return html


# route default static IP
@server.route("/")
def base(request: HTTPRequest):  
    with HTTPResponse(request, content_type=MIMEType.TYPE_HTML) as response:
        response.send(f"{webpage()}")


# if a button is pressed on the site
@server.route("/", method=HTTPMethod.POST)
def buttonpress(request: HTTPRequest):
    # get the raw text
    raw_text = request.raw_request.decode("utf8")

    if "ON_button" in raw_text:
        # turn on Relay
        Relay_ON()
    if "OFF_button" in raw_text:
        # turn off Relay
        Realy_OFF()
        
    # reload site
    with HTTPResponse(request, content_type=MIMEType.TYPE_HTML) as response:
        response.send(f"{webpage()}")


print("Starting server..")
# startup the server
try:
    server.start(str(wifi.radio.ipv4_address))
    print("Listening on http://%s" % wifi.radio.ipv4_address)
# if the server fails to begin, restart the pico w
except OSError:
    time.sleep(5)
    print("Restarting..")
    microcontroller.reset()


while True:
    try:
        # poll the server for incoming/outgoing requests
        server.poll()
    except Exception as e:
        print(e)
        continue

