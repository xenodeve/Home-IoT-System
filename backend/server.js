const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mqtt = require('mqtt');
const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const TimeService = require('./services/timeService');
const initScheduler = require('./services/scheduler');
const FileStorage = require('./services/fileStorage');
const MongoStorage = require('./services/mongoStorage');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const PICO_IP = process.env.PICO_IP || '192.168.1.100';
const MOCK_MODE = process.env.MOCK_MODE === 'true';

// MQTT Configuration
const MQTT_ENABLED = process.env.MQTT_ENABLED === 'true';
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'home-iot-backend';

// Scheduling configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'file';
const MONGODB_URI = process.env.MONGODB_URI || '';
const TIMEZONE = process.env.TIMEZONE || 'Asia/Bangkok';
const TIME_API_URL = process.env.TIME_API_URL || 'https://worldtimeapi.org/api';
const GOOGLE_TIMEZONE_API_KEY = process.env.GOOGLE_TIMEZONE_API_KEY || '';
const SCHEDULER_INTERVAL_MS = Number(process.env.SCHEDULER_INTERVAL_MS || 30000);

// Services
const timeService = new TimeService({ 
  baseUrl: TIME_API_URL, 
  timezone: TIMEZONE,
  googleApiKey: GOOGLE_TIMEZONE_API_KEY 
});

// MQTT Topics
const TOPICS = {
  RELAY_CONTROL: 'home-iot/relay/control',
  RELAY_STATUS: 'home-iot/relay/status',
  SYSTEM_STATUS: 'home-iot/system/status'
};

// Runtime state
let mockRelayState = true;
let mqttClient = null;
let mqttConnected = false;
let mongoConnected = false;
let schedulerManager = null;
let storageAdapter = null;

// Relay status cache
let relayStatusCache = {
  data: null,
  timestamp: 0,
  ttl: 1000 // 1 second cache
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Storage Setup
if (STORAGE_TYPE === 'mongodb') {
  if (!MONGODB_URI) {
    console.error('❌ STORAGE_TYPE=mongodb but MONGODB_URI is missing');
    process.exit(1);
  }

  mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .catch((err) => console.error('Mongo connection error:', err.message));

  mongoose.connection.on('connected', () => {
    mongoConnected = true;
    storageAdapter = new MongoStorage();
    console.log('✅ MongoDB connected (storage: mongodb)');

    if (!schedulerManager) {
      schedulerManager = initScheduler({
        storage: storageAdapter,
        getAuthoritativeTime: () => timeService.fetchAuthoritativeTime(),
        executeRelayAction: (action, context) => performRelayAction(action, { ...context, source: 'scheduler' }),
        intervalMs: SCHEDULER_INTERVAL_MS
      });
      schedulerManager.start();
    }
  });

  mongoose.connection.on('disconnected', () => {
    mongoConnected = false;
    console.warn('⚠️  MongoDB disconnected');
    if (schedulerManager) {
      schedulerManager.stop();
      schedulerManager = null;
    }
  });
} else {
  // File storage (default)
  storageAdapter = new FileStorage();
  console.log('✅ File storage initialized (storage: file)');
  
  schedulerManager = initScheduler({
    storage: storageAdapter,
    getAuthoritativeTime: () => timeService.fetchAuthoritativeTime(),
    executeRelayAction: (action, context) => performRelayAction(action, { ...context, source: 'scheduler' }),
    intervalMs: SCHEDULER_INTERVAL_MS
  });
  schedulerManager.start();
}

// MQTT Setup
if (MQTT_ENABLED) {
  const mqttOptions = {
    clientId: MQTT_CLIENT_ID,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000
  };

  if (MQTT_USERNAME && MQTT_PASSWORD) {
    mqttOptions.username = MQTT_USERNAME;
    mqttOptions.password = MQTT_PASSWORD;
  }

  mqttClient = mqtt.connect(MQTT_BROKER, mqttOptions);

  mqttClient.on('connect', () => {
    mqttConnected = true;
    console.log('📡 MQTT Connected to broker:', MQTT_BROKER);

    mqttClient.subscribe(TOPICS.RELAY_CONTROL, (err) => {
      if (err) {
        console.error('MQTT subscription error:', err);
      } else {
        console.log('📨 Subscribed to:', TOPICS.RELAY_CONTROL);
      }
    });

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
    if (topic !== TOPICS.RELAY_CONTROL) return;

    try {
      const payload = JSON.parse(message.toString());
      
      // ป้องกัน loop: ข้าม message ที่มาจาก backend เอง
      if (payload?.source === 'backend' || payload?.source === 'mqtt-control') {
        return;
      }
      
      if (payload?.state) {
        await performRelayAction(payload.state, { source: 'mqtt-control' });
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error.message);
    }
  });
}

// Helper: publish relay status via MQTT
function publishRelayStatus(state, meta = {}) {
  if (mqttClient && mqttConnected) {
    const payload = JSON.stringify({
      state,
      timestamp: new Date().toISOString(),
      source: meta.source || 'backend',
      scheduleId: meta.scheduleId || null,
      requestedAt: meta.requestedAt || null
    });
    mqttClient.publish(TOPICS.RELAY_STATUS, payload, { qos: 1 });
  }
}

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

async function performRelayAction(targetState, context = {}) {
  const state = String(targetState).toLowerCase();
  if (!['on', 'off'].includes(state)) {
    throw new Error('Invalid relay state');
  }

  // Clear cache when relay state changes
  relayStatusCache.data = null;

  if (MOCK_MODE) {
    mockRelayState = state === 'on';
    console.log(`🧪 Mock relay set to ${state} (${context.source || 'api'})`);
    publishRelayStatus(state, context);
    return { state, mock: MOCK_MODE };
  }

  // Try MQTT first if enabled and connected
  if (mqttClient && mqttConnected) {
    try {
      const controlPayload = JSON.stringify({ 
        state,
        timestamp: new Date().toISOString(),
        source: 'backend',  // ระบุว่ามาจาก backend เพื่อป้องกัน loop
        scheduleId: context.scheduleId || null
      });
      
      await new Promise((resolve, reject) => {
        mqttClient.publish(TOPICS.RELAY_CONTROL, controlPayload, { qos: 1 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(`📡 MQTT command sent: ${state} (${context.source || 'api'})`);
      publishRelayStatus(state, context);
      return { state, mock: false, method: 'mqtt' };
    } catch (mqttError) {
      console.warn(`⚠️  MQTT publish failed, falling back to HTTP: ${mqttError.message}`);
    }
  }

  // Fallback to HTTP if MQTT not available or failed
  try {
    await axios.post(
      `http://${PICO_IP}/api/relay`,
      { state },
      { timeout: 5000, headers: { 'Content-Type': 'application/json' } }
    );
    console.log(`🌐 HTTP command sent: ${state} (${context.source || 'api'})`);
    publishRelayStatus(state, context);
    return { state, mock: false, method: 'http' };
  } catch (httpError) {
    console.error(`❌ HTTP command failed: ${httpError.message}`);
    throw new Error(`Failed to control relay via HTTP: ${httpError.message}`);
  }
}

function ensureStorageReady(res) {
  if (!storageAdapter) {
    res.status(503).json({ error: 'Storage not initialized' });
    return false;
  }
  return true;
}

// Routes
app.get('/health', async (req, res) => {
  let scheduleStats = 0;
  if (storageAdapter) {
    try {
      const pending = await storageAdapter.find({ status: 'pending' });
      scheduleStats = pending.length;
    } catch {}
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mqtt: { enabled: MQTT_ENABLED, connected: mqttConnected },
    storage: { type: STORAGE_TYPE, ready: Boolean(storageAdapter), mongoConnected },
    schedules: { pending: scheduleStats }
  });
});

app.get('/api/time/now', async (req, res) => {
  try {
    const snapshot = await timeService.fetchAuthoritativeTime(req.query.timezone);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch time', message: error.message });
  }
});

app.get('/api/relay/status', async (req, res) => {
  try {
    const now = Date.now();
    
    // Return cached data if still valid
    if (relayStatusCache.data && (now - relayStatusCache.timestamp) < relayStatusCache.ttl) {
      console.log('💾 Returning cached relay status');
      return res.json(relayStatusCache.data);
    }

    if (MOCK_MODE) {
      const mockData = { state: mockRelayState ? 'on' : 'off', success: true, mock: true, connected: true };
      relayStatusCache.data = mockData;
      relayStatusCache.timestamp = now;
      return res.json(mockData);
    }

    const response = await axios.get(`http://${PICO_IP}/api/relay`, { timeout: 5000 });
    const responseData = { ...response.data, connected: true, picoIp: PICO_IP };
    
    // Cache the successful response
    relayStatusCache.data = responseData;
    relayStatusCache.timestamp = now;
    
    res.json(responseData);
  } catch (error) {
    console.error('Error getting relay status:', error.message);
    
    const isConnectionError = error.code === 'ECONNREFUSED' || 
                              error.code === 'ETIMEDOUT' || 
                              error.code === 'ENOTFOUND' ||
                              error.code === 'ECONNRESET';
    
    // Don't cache errors
    relayStatusCache.data = null;
    
    res.status(503).json({ 
      success: false,
      connected: false,
      error: isConnectionError ? 'ไม่สามารถเชื่อมต่อกับ Pico W ได้' : 'เกิดข้อผิดพลาด',
      message: error.message, 
      picoIp: PICO_IP,
      errorCode: error.code
    });
  }
});

app.post('/api/relay/control', async (req, res) => {
  try {
    const { state } = req.body;
    const result = await performRelayAction(state, { source: 'api-control' });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/relay/toggle', async (req, res) => {
  try {
    const nextState = !mockRelayState;
    const result = await performRelayAction(nextState ? 'on' : 'off', { source: 'api-toggle' });
    res.json({ success: true, previousState: result.state === 'on' ? 'off' : 'on', newState: result.state });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle relay', message: error.message });
  }
});

// Scheduling endpoints
app.get('/api/schedules', async (req, res) => {
  if (!ensureStorageReady(res)) return;
  const schedules = await storageAdapter.findAll({ createdAt: -1 });
  res.json({ data: schedules });
});

app.post('/api/schedules', async (req, res) => {
  if (!ensureStorageReady(res)) return;

  try {
    const { name, action, executeAt, timezone, notes } = req.body;

    if (!action || !executeAt) {
      return res.status(400).json({ error: 'action and executeAt are required' });
    }

    const tz = timezone || TIMEZONE;
    const parsed = DateTime.fromISO(executeAt, { zone: tz });
    if (!parsed.isValid) {
      return res.status(400).json({ error: 'Invalid executeAt format' });
    }

    const snapshot = await timeService.fetchAuthoritativeTime(tz);
    if (parsed.toJSDate() <= snapshot.now) {
      return res.status(400).json({ error: 'Execute time must be in the future' });
    }

    const schedule = await storageAdapter.create({
      name: name || `${action === 'on' ? 'เปิด' : 'ปิด'} @ ${parsed.setZone(tz).toFormat('fff')}`,
      action: action.toLowerCase(),
      executeAt: parsed.toUTC().toJSDate(),
      timezone: tz,
      status: 'pending',
      metadata: {
        createdBy: 'dashboard',
        notes: notes || '',
        requestedAt: snapshot.now
      }
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error creating schedule:', error.message);
    res.status(500).json({ error: 'Failed to create schedule', message: error.message });
  }
});

app.patch('/api/schedules/:id/cancel', async (req, res) => {
  if (!ensureStorageReady(res)) return;

  try {
    const existing = await storageAdapter.findById(req.params.id);
    if (!existing || !['pending', 'processing'].includes(existing.status)) {
      return res.status(404).json({ error: 'Schedule not found or already completed' });
    }

    const schedule = await storageAdapter.updateById(req.params.id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    });

    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel schedule', message: error.message });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  if (!ensureStorageReady(res)) return;

  try {
    await storageAdapter.deleteById(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete schedule', message: error.message });
  }
});

// Error handlers
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Express backend running on http://localhost:${PORT}`);
  if (MOCK_MODE) {
    console.log('🧪 MOCK MODE ENABLED - Simulating Pico W without hardware');
  } else {
    console.log(`📡 Pico W target: ${PICO_IP}`);
  }

  if (MQTT_ENABLED) {
    console.log(`🌐 MQTT ENABLED - Broker ${MQTT_BROKER}`);
    console.log('   Topics:', TOPICS);
  } else {
    console.log('⚠️  MQTT DISABLED - Set MQTT_ENABLED=true to enable');
  }

  if (!MONGODB_URI) {
    console.log('⚠️  Scheduling disabled (missing MONGODB_URI)');
  }
});

module.exports = app;
