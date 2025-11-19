const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mqtt = require('mqtt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const PICO_IP = process.env.PICO_IP || '192.168.1.100'; // ตั้งค่า IP ของ Pico W
const MOCK_MODE = process.env.MOCK_MODE === 'true'; // Mock mode สำหรับทดสอบโดยไม่มี Pico W

// MQTT Configuration
const MQTT_ENABLED = process.env.MQTT_ENABLED === 'true';
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'home-iot-backend';

// MQTT Topics
const TOPICS = {
  RELAY_CONTROL: 'home-iot/relay/control',  // Subscribe: receive commands
  RELAY_STATUS: 'home-iot/relay/status',    // Publish: send status updates
  SYSTEM_STATUS: 'home-iot/system/status'   // Publish: system info
};

// Mock relay state (for testing without hardware)
let mockRelayState = true;
let mqttClient = null;
let mqttConnected = false;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MQTT Setup
if (MQTT_ENABLED) {
  const mqttOptions = {
    clientId: MQTT_CLIENT_ID,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  };

  if (MQTT_USERNAME && MQTT_PASSWORD) {
    mqttOptions.username = MQTT_USERNAME;
    mqttOptions.password = MQTT_PASSWORD;
  }

  mqttClient = mqtt.connect(MQTT_BROKER, mqttOptions);

  mqttClient.on('connect', () => {
    mqttConnected = true;
    console.log('📡 MQTT Connected to broker:', MQTT_BROKER);
    
    // Subscribe to control topic
    mqttClient.subscribe(TOPICS.RELAY_CONTROL, (err) => {
      if (err) {
        console.error('MQTT subscription error:', err);
      } else {
        console.log('📨 Subscribed to:', TOPICS.RELAY_CONTROL);
      }
    });

    // Publish system status
    publishSystemStatus();
  });

  mqttClient.on('error', (error) => {
    mqttConnected = false;
    console.error('MQTT Error:', error.message);
  });

  mqttClient.on('close', () => {
    mqttConnected = false;
    console.log('MQTT Connection closed');
  });

  mqttClient.on('message', async (topic, message) => {
    console.log(`📩 MQTT Message received on ${topic}:`, message.toString());
    
    if (topic === TOPICS.RELAY_CONTROL) {
      try {
        const payload = JSON.parse(message.toString());
        const state = payload.state;
        
        if (state && ['on', 'off'].includes(state.toLowerCase())) {
          // Control relay via HTTP or mock
          if (MOCK_MODE) {
            mockRelayState = state.toLowerCase() === 'on';
            console.log(`🧪 Mock relay: ${state}`);
          } else {
            await axios.post(
              `http://${PICO_IP}/api/relay`,
              { state: state.toLowerCase() },
              { timeout: 5000, headers: { 'Content-Type': 'application/json' } }
            );
          }
          
          // Publish status update
          publishRelayStatus(state.toLowerCase());
        }
      } catch (error) {
        console.error('Error processing MQTT message:', error.message);
      }
    }
  });
}

// Helper function to publish relay status
function publishRelayStatus(state) {
  if (mqttClient && mqttConnected) {
    const payload = JSON.stringify({
      state: state,
      timestamp: new Date().toISOString(),
      source: 'backend'
    });
    mqttClient.publish(TOPICS.RELAY_STATUS, payload, { qos: 1 });
    console.log('📤 Published relay status:', state);
  }
}

// Helper function to publish system status
function publishSystemStatus() {
  if (mqttClient && mqttConnected) {
    const payload = JSON.stringify({
      online: true,
      mockMode: MOCK_MODE,
      timestamp: new Date().toISOString()
    });
    mqttClient.publish(TOPICS.SYSTEM_STATUS, payload, { qos: 1, retain: true });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mqtt: {
      enabled: MQTT_ENABLED,
      connected: mqttConnected
    }
  });
});

// Get relay status
app.get('/api/relay/status', async (req, res) => {
  try {
    if (MOCK_MODE) {
      // Mock response
      console.log('Mock mode: returning simulated relay status');
      return res.json({ 
        state: mockRelayState ? 'on' : 'off', 
        success: true,
        mock: true
      });
    }

    const response = await axios.get(`http://${PICO_IP}/api/relay`, {
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error getting relay status:', error.message);
    res.status(500).json({ 
      error: 'Failed to get relay status',
      message: error.message,
      picoIp: PICO_IP,
      hint: 'Set MOCK_MODE=true in .env to test without Pico W'
    });
  }
});

// Control relay (turn on/off)
app.post('/api/relay/control', async (req, res) => {
  try {
    const { state } = req.body;
    
    if (!state || !['on', 'off'].includes(state.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid state. Must be "on" or "off"' 
      });
    }

    if (MOCK_MODE) {
      // Mock response
      mockRelayState = state.toLowerCase() === 'on';
      console.log(`Mock mode: relay turned ${state.toLowerCase()}`);
      
      // Publish to MQTT if enabled
      publishRelayStatus(state.toLowerCase());
      
      return res.json({
        success: true,
        state: state.toLowerCase(),
        mock: true,
        timestamp: new Date().toISOString()
      });
    }

    const response = await axios.post(
      `http://${PICO_IP}/api/relay`,
      { state: state.toLowerCase() },
      { 
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Publish to MQTT if enabled
    publishRelayStatus(state.toLowerCase());
    
    res.json({
      success: true,
      state: state.toLowerCase(),
      data: response.data
    });
  } catch (error) {
    console.error('Error controlling relay:', error.message);
    res.status(500).json({ 
      error: 'Failed to control relay',
      message: error.message,
      picoIp: PICO_IP,
      hint: 'Set MOCK_MODE=true in .env to test without Pico W'
    });
  }
});

// Toggle relay (convenience endpoint)
app.post('/api/relay/toggle', async (req, res) => {
  try {
    if (MOCK_MODE) {
      // Mock response
      const previousState = mockRelayState ? 'on' : 'off';
      mockRelayState = !mockRelayState;
      const newState = mockRelayState ? 'on' : 'off';
      console.log(`Mock mode: relay toggled from ${previousState} to ${newState}`);
      
      // Publish to MQTT if enabled
      publishRelayStatus(newState);
      
      return res.json({
        success: true,
        previousState: previousState,
        newState: newState,
        mock: true,
        timestamp: new Date().toISOString()
      });
    }

    // First get current status
    const statusResponse = await axios.get(`http://${PICO_IP}/api/relay`, {
      timeout: 5000
    });
    
    const currentState = statusResponse.data.state;
    const newState = currentState === 'on' ? 'off' : 'on';

    // Then toggle it
    const controlResponse = await axios.post(
      `http://${PICO_IP}/api/relay`,
      { state: newState },
      { 
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Publish to MQTT if enabled
    publishRelayStatus(newState);
    
    res.json({
      success: true,
      previousState: currentState,
      newState: newState,
      data: controlResponse.data
    });
  } catch (error) {
    console.error('Error toggling relay:', error.message);
    res.status(500).json({ 
      error: 'Failed to toggle relay',
      message: error.message,
      picoIp: PICO_IP,
      hint: 'Set MOCK_MODE=true in .env to test without Pico W'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express backend running on http://localhost:${PORT}`);
  
  if (MOCK_MODE) {
    console.log(`🧪 MOCK MODE ENABLED - Simulating Pico W without hardware`);
    console.log(`   (Set MOCK_MODE=false in .env to use real Pico W)`);
  } else {
    console.log(`📡 Configured to communicate with Pico W at ${PICO_IP}`);
  }
  
  if (MQTT_ENABLED) {
    console.log(`🌐 MQTT ENABLED - Connecting to broker at ${MQTT_BROKER}`);
    console.log(`   Topics:`);
    console.log(`   - Control: ${TOPICS.RELAY_CONTROL}`);
    console.log(`   - Status:  ${TOPICS.RELAY_STATUS}`);
    console.log(`   - System:  ${TOPICS.SYSTEM_STATUS}`);
  } else {
    console.log(`⚠️  MQTT DISABLED - Set MQTT_ENABLED=true in .env to enable`);
  }
  
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /api/relay/status - Get relay status`);
  console.log(`  POST /api/relay/control - Control relay (body: {"state": "on"|"off"})`);
  console.log(`  POST /api/relay/toggle - Toggle relay state`);
});

module.exports = app;
