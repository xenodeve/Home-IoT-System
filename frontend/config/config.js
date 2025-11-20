// Application configuration constants
export const APP_CONFIG = {
  // API endpoints
  // For Cross-LAN: Set VITE_API_BASE in .env to full URL (e.g., https://your-backend.com/api)
  // For Same-LAN: Use default '/api' (relative path)
  API_BASE: import.meta.env.VITE_API_BASE || '/api',
  
  // Polling intervals (in milliseconds)
  TIME_SYNC_INTERVAL: 10000,        // ดึงข้อมูลเวลาใหม่ทุก 10 วินาทีจาก Backend
  SCHEDULE_FETCH_INTERVAL: 30000,   // ดึงข้อมูลกำหนดการทุก 30 วินาทีจาก Backend
  CLOCK_UPDATE_INTERVAL: 1000,      // เพิ่มเวลาทุกวินาทีเพื่อไม่ต้อง เรียก API บ่อยเกินไป
  
  // Timezones
  TIMEZONES: ['Asia/Bangkok', 'Asia/Singapore', 'UTC', 'America/New_York', 'Europe/London'],
  DEFAULT_TIMEZONE: 'Asia/Bangkok'
}
