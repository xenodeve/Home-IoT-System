// ค่าคงที่การตั้งค่าแอปพลิเคชัน
export const APP_CONFIG = {
  // จุดสิ้นสุด API
  // สำหรับ Cross-LAN: ตั้ง VITE_API_BASE ใน .env เป็น URL เต็ม (เช่น https://your-backend.com/api)
  // สำหรับ Same-LAN: ใช้ค่า default '/api' (relative path)
  API_BASE: import.meta.env.VITE_API_BASE || '/api',

  // ช่วงเวลาการ polling (ในมิลลิวินาที)
  TIME_SYNC_INTERVAL: 10000,        // ดึงข้อมูลเวลาใหม่ทุก 10 วินาทีจาก Backend
  SCHEDULE_FETCH_INTERVAL: 30000,   // ดึงข้อมูลกำหนดการทุก 30 วินาทีจาก Backend
  CLOCK_UPDATE_INTERVAL: 1000,      // เพิ่มเวลาทุกวินาทีเพื่อไม่ต้อง เรียก API บ่อยเกินไป

  // โซนเวลา
  TIMEZONES: ['Asia/Bangkok', 'Asia/Singapore', 'UTC', 'America/New_York', 'Europe/London'],
  DEFAULT_TIMEZONE: 'Asia/Bangkok'
}
