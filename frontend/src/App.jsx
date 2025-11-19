import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import mqtt from 'mqtt'
import { MQTT_CONFIG } from './mqttConfig'
import './App.css'

function App() {
  const [relayState, setRelayState] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isMockMode, setIsMockMode] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [mqttStatus, setMqttStatus] = useState({ enabled: false, connected: false })
  const [frontendMqttConnected, setFrontendMqttConnected] = useState(false)
  
  const mqttClientRef = useRef(null)

  // API base URL - ใช้ /api เพราะ Vite proxy จะ forward ไปที่ backend
  const API_BASE = '/api'

  // Setup MQTT connection
  useEffect(() => {
    console.log('🌐 Connecting to MQTT broker via WebSocket...')
    
    try {
      // Connect to MQTT broker via WebSocket
      const client = mqtt.connect(MQTT_CONFIG.BROKER_URL, MQTT_CONFIG.OPTIONS)
      mqttClientRef.current = client

      client.on('connect', () => {
        console.log('✅ Frontend MQTT Connected!')
        setFrontendMqttConnected(true)
        
        // Subscribe to status topics
        client.subscribe(MQTT_CONFIG.TOPICS.RELAY_STATUS, (err) => {
          if (err) {
            console.error('❌ Subscribe error:', err)
          } else {
            console.log('📨 Subscribed to:', MQTT_CONFIG.TOPICS.RELAY_STATUS)
          }
        })
        
        client.subscribe(MQTT_CONFIG.TOPICS.SYSTEM_STATUS, (err) => {
          if (!err) {
            console.log('📨 Subscribed to:', MQTT_CONFIG.TOPICS.SYSTEM_STATUS)
          }
        })
      })

      client.on('message', (topic, message) => {
        console.log('📩 Received:', topic, message.toString())
        
        try {
          const payload = JSON.parse(message.toString())
          
          if (topic === MQTT_CONFIG.TOPICS.RELAY_STATUS) {
            // Update relay state from MQTT
            setRelayState(payload.state === 'on')
            setLastUpdate(new Date().toLocaleTimeString('th-TH'))
            console.log('🔄 Real-time update: Relay', payload.state)
          }
        } catch (err) {
          console.error('Error parsing MQTT message:', err)
        }
      })

      client.on('error', (error) => {
        console.error('❌ MQTT Error:', error)
        setFrontendMqttConnected(false)
      })

      client.on('close', () => {
        console.log('🔌 MQTT Connection closed')
        setFrontendMqttConnected(false)
      })

      client.on('reconnect', () => {
        console.log('🔄 MQTT Reconnecting...')
      })

      // Cleanup on unmount
      return () => {
        if (client) {
          console.log('🔌 Disconnecting MQTT...')
          client.end()
        }
      }
    } catch (err) {
      console.error('Failed to connect to MQTT:', err)
      setFrontendMqttConnected(false)
    }
  }, [])

  // Fetch initial relay status
  useEffect(() => {
    fetchRelayStatus()
  }, [])

  const fetchRelayStatus = async () => {
    try {
      setError(null)
      const response = await axios.get(`${API_BASE}/relay/status`)
      setRelayState(response.data.state === 'on')
      setIsMockMode(response.data.mock || false)
      setLastUpdate(new Date().toLocaleTimeString('th-TH'))
      
      // Also fetch health to get MQTT status
      const healthResponse = await axios.get('/health')
      if (healthResponse.data.mqtt) {
        setMqttStatus(healthResponse.data.mqtt)
      }
    } catch (err) {
      console.error('Error fetching relay status:', err)
      setError('ไม่สามารถเชื่อมต่อกับ backend ได้')
    }
  }

  const controlRelay = async (state) => {
    try {
      setLoading(true)
      setError(null)
      
      // If MQTT is connected, publish directly
      if (frontendMqttConnected && mqttClientRef.current) {
        const payload = JSON.stringify({ state: state ? 'on' : 'off' })
        mqttClientRef.current.publish(
          MQTT_CONFIG.TOPICS.RELAY_CONTROL,
          payload,
          { qos: 1 }
        )
        console.log('📤 Published via MQTT:', payload)
        // State will be updated via MQTT message callback
      } else {
        // Fallback to HTTP API
        const response = await axios.post(`${API_BASE}/relay/control`, {
          state: state ? 'on' : 'off'
        })

        if (response.data.success) {
          setRelayState(state)
          setIsMockMode(response.data.mock || false)
          setLastUpdate(new Date().toLocaleTimeString('th-TH'))
        }
      }
    } catch (err) {
      console.error('Error controlling relay:', err)
      setError('เกิดข้อผิดพลาดในการควบคุมรีเลย์')
    } finally {
      setLoading(false)
    }
  }

  const toggleRelay = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Toggle based on current state
      const newState = !relayState
      
      // If MQTT is connected, publish directly
      if (frontendMqttConnected && mqttClientRef.current) {
        const payload = JSON.stringify({ state: newState ? 'on' : 'off' })
        mqttClientRef.current.publish(
          MQTT_CONFIG.TOPICS.RELAY_CONTROL,
          payload,
          { qos: 1 }
        )
        console.log('📤 Published toggle via MQTT:', payload)
        // State will be updated via MQTT message callback
      } else {
        // Fallback to HTTP API
        const response = await axios.post(`${API_BASE}/relay/toggle`)

        if (response.data.success) {
          setRelayState(response.data.newState === 'on')
          setIsMockMode(response.data.mock || false)
          setLastUpdate(new Date().toLocaleTimeString('th-TH'))
        }
      }
    } catch (err) {
      console.error('Error toggling relay:', err)
      setError('เกิดข้อผิดพลาดในการสลับสถานะรีเลย์')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🏠 Home IoT Control</h1>
          <p>ระบบควบคุมรีเลย์ผ่านเว็บ</p>
          <div className="badges">
            {isMockMode && (
              <div className="mock-badge">
                🧪 Mock Mode
              </div>
            )}
            {mqttStatus.enabled && (
              <div className={`mqtt-badge ${mqttStatus.connected ? 'connected' : 'disconnected'}`}>
                {mqttStatus.connected ? '🌐 Backend MQTT' : '⚠️ Backend MQTT Off'}
              </div>
            )}
            <div className={`mqtt-badge ${frontendMqttConnected ? 'connected' : 'disconnected'}`}>
              {frontendMqttConnected ? '✨ Real-time ON' : '⏸️ Real-time OFF'}
            </div>
          </div>
        </header>

        <div className="status-card">
          <div className="status-indicator">
            <div className={`status-light ${relayState ? 'on' : 'off'}`}></div>
            <div className="status-text">
              <h2>สถานะรีเลย์</h2>
              <p className={`status-label ${relayState ? 'on' : 'off'}`}>
                {relayState ? '🟢 เปิด' : '⚫ ปิด'}
              </p>
            </div>
          </div>
          
          {lastUpdate && (
            <p className="last-update">อัพเดทล่าสุด: {lastUpdate}</p>
          )}
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="controls">
          <button
            className={`control-button on ${relayState ? 'active' : ''}`}
            onClick={() => controlRelay(true)}
            disabled={loading || relayState}
          >
            <span className="button-icon">💡</span>
            <span className="button-text">เปิด</span>
          </button>

          <button
            className="control-button toggle"
            onClick={toggleRelay}
            disabled={loading}
          >
            <span className="button-icon">🔄</span>
            <span className="button-text">สลับ</span>
          </button>

          <button
            className={`control-button off ${!relayState ? 'active' : ''}`}
            onClick={() => controlRelay(false)}
            disabled={loading || !relayState}
          >
            <span className="button-icon">🌙</span>
            <span className="button-text">ปิด</span>
          </button>
        </div>

        <button
          className="refresh-button"
          onClick={fetchRelayStatus}
          disabled={loading}
        >
          🔄 รีเฟรชสถานะ
        </button>

        <footer className="footer">
          <p>Powered by Pico W + Express + React</p>
        </footer>
      </div>
    </div>
  )
}

export default App
