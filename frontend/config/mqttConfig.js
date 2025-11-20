// การตั้งค่า MQTT สำหรับ Frontend
// ใช้การเชื่อมต่อ WebSocket กับ MQTT broker

export const MQTT_CONFIG = {
  // HiveMQ Public Broker ที่รองรับ WebSocket
  BROKER_URL: 'wss://broker.hivemq.com:8884/mqtt',

  // หัวข้อ
  TOPICS: {
    RELAY_CONTROL: 'home-iot/relay/control',
    RELAY_STATUS: 'home-iot/relay/status',
    SYSTEM_STATUS: 'home-iot/system/status',
    DEVICE_STATUS: 'home-iot/device/status'
  },

  // ตัวเลือกไคลเอนต์
  OPTIONS: {
    clientId: `frontend_${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  }
};

// Broker ทางเลือก (comment/uncomment เพื่อสลับ)
// export const MQTT_CONFIG = {
//   BROKER_URL: 'ws://broker.hivemq.com:8000/mqtt', // Non-SSL
//   ...
// };
