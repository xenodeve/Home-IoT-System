import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import mqtt from 'mqtt'
import { MQTT_CONFIG } from '../config/mqttConfig'
import { APP_CONFIG } from '../config/config'
import Counter from './components/Counter'
import { MagicBentoCard, MagicBentoGrid } from './components/MagicBento'
import AnimatedSelect from './components/AnimatedSelect'
import DateDropdown from './components/DateDropdown'
import TimeDropdown from './components/TimeDropdown'
import './App.css'

const API_BASE = APP_CONFIG.API_BASE
const TIMEZONES = APP_CONFIG.TIMEZONES

function App() {
  const [relayState, setRelayState] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isMockMode, setIsMockMode] = useState(false)
  const [backendConnected, setBackendConnected] = useState(true)
  const [relayConnected, setRelayConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [mqttStatus, setMqttStatus] = useState({ enabled: false, connected: false })
  const [frontendMqttConnected, setFrontendMqttConnected] = useState(false)
  const [timeSnapshot, setTimeSnapshot] = useState(null)
  const [currentTime, setCurrentTime] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [scheduleError, setScheduleError] = useState(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [creatingSchedule, setCreatingSchedule] = useState(false)
  const [schedulingAvailable, setSchedulingAvailable] = useState(true)
  const [timeContentVisible, setTimeContentVisible] = useState(true)
  const [relayBadgeVisible, setRelayBadgeVisible] = useState(true)
  const [mqttBadgeVisible, setMqttBadgeVisible] = useState(true)
  const prevBackendConnected = useRef(backendConnected)
  const prevRelayConnected = useRef(relayConnected)
  const prevFrontendMqttConnected = useRef(frontendMqttConnected)

  const [form, setForm] = useState({
    name: '',
    action: 'on',
    date: '',
    time: '',
    timezone: APP_CONFIG.DEFAULT_TIMEZONE,
    notes: ''
  })

  const mqttClientRef = useRef(null)

  useEffect(() => {
    const client = mqtt.connect(MQTT_CONFIG.BROKER_URL, MQTT_CONFIG.OPTIONS)
    mqttClientRef.current = client

    client.on('connect', () => {
      setFrontendMqttConnected(true)
      client.subscribe(Object.values(MQTT_CONFIG.TOPICS))
    })

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString())
        if (topic === MQTT_CONFIG.TOPICS.RELAY_STATUS) {
          setRelayState(payload.state === 'on')
          setLastUpdate(new Date().toLocaleTimeString('th-TH'))
        }
      } catch (err) {
        console.error('MQTT parse error', err)
      }
    })

    client.on('error', () => setFrontendMqttConnected(false))
    client.on('close', () => setFrontendMqttConnected(false))

    return () => {
      client.end(true)
    }
  }, [])

  useEffect(() => {
    fetchRelayStatus()
    fetchHealth()
    fetchTime()
    fetchSchedules()

    const interval = setInterval(() => {
      fetchTime()
      fetchSchedules(false)
    }, APP_CONFIG.SCHEDULE_FETCH_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  // Retry fetching schedules every 5 seconds when there's an error (only if backend is connected)
  useEffect(() => {
    if (scheduleError && backendConnected) {
      const retryInterval = setInterval(() => {
        console.log('🔄 พยายามโหลดกำหนดการอีกครั้ง...')
        fetchSchedules(false)
      }, 5000)

      return () => clearInterval(retryInterval)
    }
  }, [scheduleError, backendConnected])

  // Handle smooth transition when backend connection changes
  useEffect(() => {
    if (prevBackendConnected.current !== backendConnected) {
      setTimeContentVisible(false)
      const timer = setTimeout(() => {
        setTimeContentVisible(true)
        prevBackendConnected.current = backendConnected
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [backendConnected])

  // Handle smooth transition when relay connection changes
  useEffect(() => {
    if (prevRelayConnected.current !== relayConnected) {
      setRelayBadgeVisible(false)
      const timer = setTimeout(() => {
        setRelayBadgeVisible(true)
        prevRelayConnected.current = relayConnected
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [relayConnected])

  // Handle smooth transition when mqtt connection changes
  useEffect(() => {
    if (prevFrontendMqttConnected.current !== frontendMqttConnected) {
      setMqttBadgeVisible(false)
      const timer = setTimeout(() => {
        setMqttBadgeVisible(true)
        prevFrontendMqttConnected.current = frontendMqttConnected
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [frontendMqttConnected])

  // Check backend status every 5 seconds (always check, faster reconnect when disconnected)
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      if (!backendConnected) {
        console.log('🔄 พยายามเชื่อมต่อ Backend อีกครั้ง...')
      } else if (!relayConnected) {
        console.log('🔄 พยายามเชื่อมต่อ Relay อีกครั้ง...')
      }
      fetchRelayStatus()
    }, 5000)

    return () => clearInterval(healthCheckInterval)
  }, [backendConnected, relayConnected])

  const fetchHealth = async () => {
    try {
      const { data } = await axios.get('/health')
      setMqttStatus(data.mqtt)
    } catch (err) {
      console.error('Health check failed', err)
    }
  }

  const fetchTime = async () => {
    try {
      const { data } = await axios.get('/api/time/now')
      setTimeSnapshot(data)
      setCurrentTime(new Date(data.now))
    } catch (err) {
      console.error('Time sync failed', err)
    }
  }

  // Update current time every second
  useEffect(() => {
    if (!currentTime) return

    const timer = setInterval(() => {
      setCurrentTime(prev => new Date(prev.getTime() + 1000))
    }, APP_CONFIG.CLOCK_UPDATE_INTERVAL)

    return () => clearInterval(timer)
  }, [currentTime])

  // Sync time with backend every 30 seconds
  useEffect(() => {
    const syncTimer = setInterval(() => {
      fetchTime()
    }, APP_CONFIG.TIME_SYNC_INTERVAL)

    return () => clearInterval(syncTimer)
  }, [])

  const fetchSchedules = async (showLoader = true) => {
    if (showLoader) setScheduleLoading(true)
    try {
      const { data } = await axios.get(`${API_BASE}/schedules`)
      setSchedules(data.data || [])
      setSchedulingAvailable(true)
      setScheduleError(null)
    } catch (err) {
      if (err.response?.status === 503) {
        setSchedulingAvailable(false)
      }
      setScheduleError('ไม่สามารถโหลดกำหนดการได้')
    } finally {
      if (showLoader) setScheduleLoading(false)
    }
  }

  const fetchRelayStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/relay/status`)
      setRelayState(response.data.state === 'on')
      setIsMockMode(response.data.mock || false)
      setBackendConnected(true)
      setRelayConnected(response.data.connected !== false)
      setLastUpdate(new Date().toLocaleTimeString('th-TH'))
      setError(null)
      // Restore MQTT client status when backend reconnects
      if (mqttClientRef.current?.connected) {
        setFrontendMqttConnected(true)
      }
    } catch (err) {
      console.error('Error fetching relay status:', err)
      
      if (err.response?.status === 503) {
        // Pico W connection error
        setBackendConnected(true)
        setRelayConnected(false)
        setError('ไม่สามารถเชื่อมต่อกับ Relay ได้')
        // Restore MQTT client status
        if (mqttClientRef.current?.connected) {
          setFrontendMqttConnected(true)
        }
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        // Backend connection error
        setBackendConnected(false)
        setRelayConnected(false)
        setFrontendMqttConnected(false)
        setError('ไม่สามารถเชื่อมต่อกับ Backend ได้')
      } else {
        setBackendConnected(false)
        setRelayConnected(false)
        setFrontendMqttConnected(false)
        setError('เกิดข้อผิดพลาดในการตรวจสอบสถานะ')
      }
    }
  }

  const controlRelay = async (state) => {
    // ป้องกันการส่งคำสั่งซ้ำถ้า state เท่าเดิม
    if (loading || state === relayState) return

    const previousState = relayState
    const targetState = state ? 'on' : 'off'
    setRelayState(state)

    try {
      setLoading(true)
      setError(null)

      if (frontendMqttConnected && mqttClientRef.current) {
        mqttClientRef.current.publish(
          MQTT_CONFIG.TOPICS.RELAY_CONTROL,
          JSON.stringify({ state: targetState }),
          { qos: 1 }
        )
      } else {
        await axios.post(`${API_BASE}/relay/control`, { state: targetState })
      }

      // รอให้ MQTT ประมวลผลเสร็จ
      await new Promise(resolve => setTimeout(resolve, 500))

      // ตรวจสอบว่า relay เปลี่ยนสถานะจริงหรือไม่
      const verifyResponse = await axios.get(`${API_BASE}/relay/status`)
      const actualState = verifyResponse.data.state

      if (actualState !== targetState) {
        // สถานะไม่ตรงกับที่สั่ง - rollback
        setRelayState(previousState)
        setError('⚠️ เกิดข้อผิดพลาดไม่สามารถควบคุม Relay ได้')
      }
    } catch (err) {
      setRelayState(previousState)
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('ไม่สามารถเชื่อมต่อกับ Backend ได้')
      } else {
        setError('เกิดข้อผิดพลาดในการควบคุมรีเลย์')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateSchedule = async (event) => {
    event.preventDefault()
    if (!form.date || !form.time) {
      setScheduleError('กรุณาเลือกวันและเวลา')
      return
    }

    const executeAt = `${form.date}T${form.time}`

    try {
      setCreatingSchedule(true)
      await axios.post(`${API_BASE}/schedules`, {
        name: form.name,
        action: form.action,
        executeAt,
        timezone: form.timezone,
        notes: form.notes
      })
      await fetchSchedules()
      setForm((prev) => ({ ...prev, name: '', notes: '' }))
      setScheduleError(null)
    } catch (err) {
      setScheduleError(err.response?.data?.error || 'สร้างกำหนดการไม่สำเร็จ')
    } finally {
      setCreatingSchedule(false)
    }
  }

  const handleCancelSchedule = async (id) => {
    try {
      await axios.patch(`${API_BASE}/schedules/${id}/cancel`)
      fetchSchedules()
    } catch (err) {
      setScheduleError('ยกเลิกกำหนดการไม่สำเร็จ')
    }
  }

  const handleDeleteSchedule = async (id) => {
    try {
      await axios.delete(`${API_BASE}/schedules/${id}`)
      fetchSchedules()
    } catch (err) {
      setScheduleError('ลบกำหนดการไม่สำเร็จ')
    }
  }

  const nextSchedule = useMemo(() => {
    return schedules.find((s) => s.status === 'pending') || null
  }, [schedules])

  const groupedSchedules = useMemo(() => {
    return {
      upcoming: schedules.filter((s) => ['pending', 'processing'].includes(s.status)),
      history: schedules.filter((s) => ['completed', 'failed', 'cancelled'].includes(s.status))
    }
  }, [schedules])

  const formatDateTime = (iso, timezone) => {
    if (!iso) return '-'
    const date = new Date(iso)
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: timezone || 'UTC'
    }).format(date)
  }

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'รอดำเนินการ',
      'processing': 'กำลังดำเนินการ',
      'completed': 'สำเร็จ',
      'failed': 'ล้มเหลว',
      'cancelled': 'ยกเลิกแล้ว'
    }
    return statusMap[status] || status
  }

  return (
    <div className="app">
      <div className="dashboard">
        <header className="dashboard__header">
          <div>
            <p className="eyebrow">Home IoT System</p>
            <h1>Smart Relay Dashboard</h1>
            <p className="subhead">ควบคุมอุปกรณ์และตั้งเวลาเปิดปิดจากศูนย์กลางเดียว</p>
          </div>
          <div className="badge-row">
            {isMockMode && <span className="chip chip--warning">🧪 Mock Mode</span>}
            <span 
              className={`chip ${relayConnected ? 'chip--success' : 'chip--danger'}`}
              style={{
                opacity: relayBadgeVisible ? 1 : 0,
                transform: relayBadgeVisible ? 'scale(1)' : 'scale(0.95)',
                transition: 'opacity 0.3s ease-out, transform 0.3s ease-out'
              }}
            >
              {relayConnected ? '✅ Relay Connected' : '❌ Relay Disconnected'}
            </span>
            {mqttStatus?.enabled && (
              <span className={`chip ${mqttStatus.connected ? 'chip--success' : 'chip--danger'}`}>
                {mqttStatus.connected ? '🌐 Backend MQTT Online' : '⚠️ Backend MQTT Offline'}
              </span>
            )}
            <span 
              className={`chip ${frontendMqttConnected ? 'chip--success' : 'chip--danger'}`}
              style={{
                opacity: mqttBadgeVisible ? 1 : 0,
                transform: mqttBadgeVisible ? 'scale(1)' : 'scale(0.95)',
                transition: 'opacity 0.3s ease-out, transform 0.3s ease-out'
              }}
            >
              {frontendMqttConnected ? '✨ Real-time Sync' : '⏸️ Real-time paused'}
            </span>
          </div>
        </header>

        <MagicBentoGrid enableSpotlight={true} spotlightRadius={300} glowColor="56, 189, 248">
          <section className="grid grid--metrics">
            <MagicBentoCard 
              enableStars={true}
              enableBorderGlow={true}
              enableTilt={false}
              enableMagnetism={true}
              clickEffect={true}
              particleCount={8}
              glowColor="56, 189, 248"
              className="card metric-card"
              style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '4px', paddingLeft: '28px' }}
            >
              <p className="label" style={{ margin: 0 }}>สถานะรีเลย์</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className={`status-dot ${relayState ? 'is-on' : 'is-off'}`} />
                <h3 style={{ margin: 0 }}>{relayState ? 'เปิดใช้งาน' : 'ปิดอยู่'}</h3>
              </div>
              {lastUpdate && <small style={{ display: 'block' }}>อัพเดทล่าสุด {lastUpdate}</small>}
            </MagicBentoCard>
            <MagicBentoCard 
              enableStars={true}
              enableBorderGlow={true}
              enableTilt={false}
              enableMagnetism={true}
              clickEffect={true}
              particleCount={8}
              glowColor="56, 189, 248"
              className="card metric-card"
              style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '4px' }}
            >
              <p className="label" style={{ margin: 0 }}>กำหนดการถัดไป</p>
              {nextSchedule ? (
                <>
                  <h3 style={{ margin: 0 }}>{nextSchedule.action === 'on' ? 'เปิด' : 'ปิด'}</h3>
                  <small style={{ display: 'block' }}>{formatDateTime(nextSchedule.executeAt, nextSchedule.timezone)}</small>
                  <small style={{ display: 'block', opacity: 0.7 }}>{nextSchedule.name}</small>
                </>
              ) : (
                <>
                  <h3 style={{ margin: 0 }}>ยังไม่มี</h3>
                  <small style={{ opacity: 0.7 }}>สร้างกำหนดการใหม่ได้ทันที</small>
                </>
              )}
            </MagicBentoCard>
            <MagicBentoCard 
              enableStars={true}
              enableBorderGlow={true}
              enableTilt={false}
              enableMagnetism={true}
              clickEffect={true}
              particleCount={8}
              glowColor="56, 189, 248"
              className="card metric-card"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
            >
              <p className="label">เวลามาตรฐาน</p>
              <div style={{
                opacity: timeContentVisible ? 1 : 0,
                transform: timeContentVisible ? 'scale(1)' : 'scale(0.98)',
                transition: 'opacity 0.3s ease-out, transform 0.3s ease-out'
              }}>
                {!backendConnected ? (
                  <div>
                    <h3>ไม่มีการเชื่อมต่อ</h3>
                    <small style={{ opacity: 0.7 }}>รอการเชื่อมต่อ backend</small>
                  </div>
                ) : currentTime ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Counter
                    value={currentTime.getHours()}
                    places={[10, 1]}
                    fontSize={36}
                    padding={4}
                    gap={2}
                    textColor="#e2e8f0"
                    fontWeight={800}
                    borderRadius={12}
                    horizontalPadding={8}
                    gradientHeight={0}
                    counterStyle={{
                      background: 'transparent',
                      border: 'none'
                    }}
                  />
                  <span style={{ fontSize: '32px', fontWeight: 800, color: '#38bdf8', marginTop: '-2px', textShadow: '0 2px 8px rgba(56, 189, 248, 0.5)' }}>:</span>
                  <Counter
                    value={currentTime.getMinutes()}
                    places={[10, 1]}
                    fontSize={36}
                    padding={4}
                    gap={2}
                    textColor="#e2e8f0"
                    fontWeight={800}
                    borderRadius={12}
                    horizontalPadding={8}
                    gradientHeight={0}
                    counterStyle={{
                      background: 'transparent',
                      border: 'none'
                    }}
                  />
                  <span style={{ fontSize: '32px', fontWeight: 800, color: '#38bdf8', marginTop: '-2px', textShadow: '0 2px 8px rgba(56, 189, 248, 0.5)' }}>:</span>
                  <Counter
                    value={currentTime.getSeconds()}
                    places={[10, 1]}
                    fontSize={36}
                    padding={4}
                    gap={2}
                    textColor="#e2e8f0"
                    fontWeight={800}
                    borderRadius={12}
                    horizontalPadding={8}
                    gradientHeight={0}
                    counterStyle={{
                      background: 'transparent',
                      border: 'none'
                    }}
                  />
                </div>
              ) : (
                  <h3>กำลังซิงค์...</h3>
                )}
                {backendConnected && (
                  <small style={{ marginTop: '4px', display: 'block', opacity: 0.7 }}>
                    source: {timeSnapshot?.source || 'system'}
                  </small>
                )}
              </div>
            </MagicBentoCard>
          </section>

          <section className="grid grid--main">
            <MagicBentoCard 
            enableStars={true}
            enableBorderGlow={true}
            enableTilt={false}
            enableMagnetism={true}
            clickEffect={true}
            clickEffectScale={0.2}
            particleCount={10}
            glowColor="56, 189, 248"
            magnetismStrength={0.015}
            className="card control-card"
          >
            <div className="card__header">
              <h2>ควบคุมแบบเรียลไทม์</h2>
              <p>ส่งคำสั่งผ่าน MQTT หรือ REST API แบบอัตโนมัติ</p>
            </div>
            {!backendConnected && (
              <div className="alert alert--error" style={{ margin: '0 0 1rem 0' }}>
                🚫 ไม่สามารถเชื่อมต่อกับ Backend ได้ - กรุณาตรวจสอบเซิร์ฟเวอร์
              </div>
            )}
            {!relayConnected && backendConnected && (
              <div className="alert alert--warning" style={{ margin: '0 0 1rem 0' }}>
                ⚠️ ไม่สามารถเชื่อมต่อกับ Relay ได้ - กรุณาตรวจสอบอุปกรณ์ Raspberry Pi Pico Wireless
              </div>
            )}
            
            <div className="control-visual">
              <div className={`light${relayState ? ' on' : ''}`}>
                <div className="wire"></div>
                <div className="bulb">
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>

            <div className="control-toggle">
              <label className={`relay-switch${loading || !relayConnected ? ' is-disabled' : ''}${loading ? ' is-busy' : ''}`}>
                <input
                  className="relay-switch__input l"
                  type="checkbox"
                  role="switch"
                  aria-checked={relayState}
                  checked={relayState}
                  disabled={loading || !relayConnected}
                  onChange={(event) => controlRelay(event.target.checked)}
                />
                <span className="relay-switch__track">
                  <span className="relay-switch__thumb" />
                </span>
                <span className="relay-switch__text">
                  <span className="relay-switch__title">{relayState ? 'รีเลย์ทำงานอยู่' : 'รีเลย์ปิดอยู่'}</span>
                  <span className="relay-switch__hint">{loading ? 'กำลังส่งคำสั่ง...' : relayConnected ? 'แตะเพื่อสลับสถานะ' : 'อุปกรณ์ไม่พร้อมใช้งาน'}</span>
                </span>
              </label>
            </div>
          </MagicBentoCard>

          <MagicBentoCard 
            enableStars={true}
            enableBorderGlow={true}
            enableTilt={false}
            enableMagnetism={true}
            clickEffect={true}
            clickEffectScale={0.2}
            particleCount={10}
            glowColor="56, 189, 248"
            magnetismStrength={0.015}
            className="card schedule-card"
          >
            <div className="card__header">
              <h2>สร้างกำหนดการ</h2>
              <p>ดึงเวลาจาก server ภายนอกเพื่อความแม่นยำ</p>
            </div>
            {!schedulingAvailable ? (
              <div className="empty-state">
                <p>ยังไม่ได้ตั้งค่า MongoDB URI บน backend</p>
                <small>เพิ่มค่า MONGODB_URI ในไฟล์ .env เพื่อเปิดใช้งาน</small>
              </div>
            ) : (
              <form className="schedule-form" onSubmit={handleCreateSchedule}>
                <div className="form-row">
                  <label>ชื่อกำหนดการ</label>
                  <input type="text" value={form.name} placeholder="เช่น เปิดไฟหน้าบ้าน" onChange={(e) => handleFormChange('name', e.target.value)} />
                </div>
                <div className="form-grid">
                  <DateDropdown
                    label="วันที่"
                    value={form.date}
                    onChange={(value) => handleFormChange('date', value)}
                  />
                  <TimeDropdown
                    label="เวลา"
                    value={form.time}
                    onChange={(value) => handleFormChange('time', value)}
                  />
                </div>
                <div className="form-grid">
                  <AnimatedSelect
                    label="การทำงาน"
                    value={form.action}
                    onChange={(value) => handleFormChange('action', value)}
                    options={[
                      { value: 'on', label: 'เปิด' },
                      { value: 'off', label: 'ปิด' }
                    ]}
                  />
                  <AnimatedSelect
                    label="โซนเวลา"
                    value={form.timezone}
                    onChange={(value) => handleFormChange('timezone', value)}
                    options={TIMEZONES.map(tz => ({ value: tz, label: tz }))}
                  />
                </div>
                <div className="form-row">
                  <label>หมายเหตุ</label>
                  <textarea value={form.notes} rows={2} onChange={(e) => handleFormChange('notes', e.target.value)} placeholder="ตัวอย่าง: เปิดก่อนพระอาทิตย์ตก" />
                </div>
                <button className="pill-button pill-button--primary" type="submit" disabled={creatingSchedule}>
                  {creatingSchedule ? 'กำลังบันทึก...' : 'บันทึกกำหนดการ'}
                </button>
              </form>
            )}
          </MagicBentoCard>
        </section>

        <section className="grid grid--full">
          <MagicBentoCard 
            enableStars={true}
            enableBorderGlow={true}
            enableTilt={false}
            enableMagnetism={true}
            clickEffect={true}
            clickEffectScale={0.1}
            particleCount={12}
            glowColor="56, 189, 248"
            magnetismStrength={0.015}
            className="card schedule-list"
          >
            <div className="card__header">
              <h2>รายการกำหนดการ</h2>
              <p>ติดตามสถานะการทำงานแบบเรียลไทม์</p>
            </div>
            {scheduleLoading ? (
              <div className="empty-state">กำลังโหลด...</div>
            ) : groupedSchedules.upcoming.length === 0 && groupedSchedules.history.length === 0 ? (
              <div className="empty-state">ยังไม่มีกำหนดการ</div>
            ) : (
              <>
                {groupedSchedules.upcoming.length > 0 && (
                  <div>
                    <h3>กำลังจะทำงาน</h3>
                    <ul>
                      {groupedSchedules.upcoming.map((schedule) => (
                        <li key={schedule._id} className={`schedule-item schedule-item--${schedule.status}`}>
                          <div>
                            <p className="schedule-title">{schedule.name}</p>
                            <small>{formatDateTime(schedule.executeAt, schedule.timezone)} • {schedule.action === 'on' ? 'เปิด' : 'ปิด'}</small>
                          </div>
                          <div className="schedule-actions">
                            <span className={`chip chip--${schedule.status}`}>{getStatusText(schedule.status)}</span>
                            {schedule.status === 'pending' && (
                              <button
                                type="button"
                                className="chip chip--pending chip--action"
                                onClick={() => handleCancelSchedule(schedule._id)}
                              >
                                ยกเลิก
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {groupedSchedules.history.length > 0 && (
                  <div>
                    <h3>ประวัติล่าสุด</h3>
                    <ul>
                      {groupedSchedules.history.slice(0, 5).map((schedule) => (
                        <li key={schedule._id} className={`schedule-item history schedule-item--${schedule.status}`}>
                          <div>
                            <p className="schedule-title">{schedule.name}</p>
                            <small>{formatDateTime(schedule.executedAt || schedule.executeAt, schedule.timezone)}</small>
                          </div>
                          <div className="schedule-actions">
                            <span className={`chip chip--${schedule.status}`}>{getStatusText(schedule.status)}</span>
                            <button
                              type="button"
                              className="chip chip--danger chip--action"
                              onClick={() => handleDeleteSchedule(schedule._id)}
                            >
                              ลบ
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </MagicBentoCard>
          </section>
        </MagicBentoGrid>

        {error && error !== 'ไม่สามารถเชื่อมต่อกับ Relay ได้' && <div className="alert alert--error">⚠️ {error}</div>}
        {scheduleError && backendConnected && <div className="alert alert--error">⚠️ {scheduleError}</div>}
      </div>
    </div>
  )
}

export default App
