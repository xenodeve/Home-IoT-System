// MQTT Configuration for Frontend
// Using WebSocket connection to MQTT broker

export const MQTT_CONFIG = {
  // HiveMQ Public Broker with WebSocket support
  BROKER_URL: 'wss://broker.hivemq.com:8884/mqtt',
  
  // Topics
  TOPICS: {
    RELAY_CONTROL: 'home-iot/relay/control',
    RELAY_STATUS: 'home-iot/relay/status',
    SYSTEM_STATUS: 'home-iot/system/status',
    DEVICE_STATUS: 'home-iot/device/status'
  },
  
  // Client options
  OPTIONS: {
    clientId: `frontend_${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  }
};

// Alternative brokers (comment/uncomment to switch)
// export const MQTT_CONFIG = {
//   BROKER_URL: 'ws://broker.hivemq.com:8000/mqtt', // Non-SSL
//   ...
// };
