# 🚀 คู่มือเริ่มต้นใช้งาน Magic Bento

## 📦 สิ่งที่ได้ติดตั้งแล้ว

✅ Magic Bento Component  
✅ Effects ทั้งหมด (Particles, Glow, Tilt, Magnetism, Ripple)  
✅ ใช้งานกับ Cards ทั้งหมด (6 cards)  
✅ ไม่ต้องติดตั้ง package เพิ่ม!

## 🎯 วิธีรัน

### 1. เข้าไปในโฟลเดอร์ frontend
```bash
cd frontend
```

### 2. ติดตั้ง dependencies (ถ้ายังไม่ได้ติดตั้ง)
```bash
npm install
```

### 3. รัน dev server
```bash
npm run dev
```

### 4. เปิดเบราว์เซอร์
```
http://localhost:5173
```

## 🎨 ทดสอบ Effects

### บนคอมพิวเตอร์:
1. ⭐ **เลื่อนเม้าส์ไปวาง** บนการดต่างๆ → เห็นดาวปรากฏขึ้น
2. 🌟 **เคลื่อนเม้าส์** → ขอบการดเรืองแสงตามเม้าส์
3. 🎯 **เลื่อนเม้าส์** → การดเอียงและเคลื่อนไหวตาม
4. 💡 **เลื่อนเม้าส์ทั่ว** → แสงส่องสว่างทั่วหน้าจอ
5. 💧 **คลิกที่การด** → เห็นเอฟเฟคคลื่น

### บนมือถือ:
- ✅ Effects บางส่วนถูกปิดเพื่อประหยัดแบต
- ✅ Ripple effect ยังทำงาน
- ✅ Border glow ทำงานแบบเบา

## 📝 Cards ที่ได้รับ Effects

### 1. Metric Cards (แถวบน)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ สถานะรีเลย์   │  │ กำหนดการถัดไป │  │ เวลามาตรฐาน  │
│              │  │              │  │              │
│ ⭐⭐⭐⭐⭐⭐⭐⭐ │  │ ⭐⭐⭐⭐⭐⭐⭐⭐ │  │ ⭐⭐⭐⭐⭐⭐⭐⭐ │
│ 8 particles  │  │ 8 particles  │  │ 8 particles  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 2. Main Cards (แถวกลาง)
```
┌────────────────────────┐  ┌────────────────────────┐
│ ควบคุมแบบเรียลไทม์      │  │ สร้างกำหนดการ         │
│                        │  │                        │
│ ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐     │  │ ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐     │
│ 10 particles           │  │ 10 particles           │
└────────────────────────┘  └────────────────────────┘
```

### 3. Schedule List Card (แถวล่าง)
```
┌──────────────────────────────────────┐
│ รายการกำหนดการ                       │
│                                      │
│ ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐                   │
│ 12 particles (มากที่สุด)             │
└──────────────────────────────────────┘
```

## 🎨 สี Theme

**สีฟ้า Cyan** (`rgb(56, 189, 248)`)
- เข้ากับธีมของแอป
- สวยงาม ทันสมัย
- เห็นชัดเจน

## ⚙️ ปรับแต่ง (ถ้าต้องการ)

### เปลี่ยนจำนวน Particles
เปิดไฟล์ `src/App.jsx` แล้วหา:
```jsx
<MagicBentoCard particleCount={8}>
```
เปลี่ยนเป็น:
```jsx
<MagicBentoCard particleCount={12}>  // เพิ่มเป็น 12
```

### เปลี่ยนสี
```jsx
<MagicBentoCard glowColor="255, 0, 128">  // สีชมพู
<MagicBentoCard glowColor="0, 255, 0">    // สีเขียว
<MagicBentoCard glowColor="255, 215, 0">  // สีทอง
```

### ปิด Effects บางตัว
```jsx
<MagicBentoCard 
  enableStars={false}       // ปิด particles
  enableTilt={false}        // ปิด tilt
  enableMagnetism={false}   // ปิด magnetic
>
```

## 🐛 แก้ปัญหา

### ไม่เห็น Effects?
1. ลองรีโหลดหน้าเว็บ (F5)
2. Clear cache (Ctrl+Shift+R)
3. ตรวจสอบ Console (F12) หา errors

### ช้า/กระตุก?
1. ลดจำนวน `particleCount`
2. ปิด `enableTilt` และ `enableMagnetism`
3. ทดสอบบนคอมอื่น

### บนมือถือทำงานไม่ดี?
- ปกติ! Effects บางส่วนถูกปิดเพื่อ performance
- ลอง reload หน้าเว็บ

## 📚 เอกสารเพิ่มเติม

1. **คู่มือโดยละเอียด (ภาษาอังกฤษ):**
   - `MAGIC_BENTO_README.md`

2. **สรุป Implementation:**
   - `IMPLEMENTATION_SUMMARY.md`

3. **คู่มือ Visual:**
   - `VISUAL_GUIDE.md`

4. **Checklist:**
   - `CHECKLIST.md`

## 💡 Tips

### เพิ่ม Performance:
- ใช้ `particleCount={6}` สำหรับการดเล็ก
- ปิด `enableTilt` ถ้าไม่จำเป็น

### เพิ่ม Effect:
- ใช้ `particleCount={15}` สำหรับการดใหญ่
- เปิดทุก effect: `enableStars enableBorderGlow enableTilt enableMagnetism clickEffect`

### สำหรับ Production:
```bash
npm run build
```

## 🎉 สนุกกับ Magic Bento!

**ทดสอบแล้ว:**
- ✅ ใช้งานได้ปกติ
- ✅ ไม่มี errors
- ✅ Performance ดี
- ✅ ทำงานครบทุก card

**ต่อไปนี้:**
1. รัน `npm run dev`
2. เปิด browser
3. ลองเอาเม้าส์ไปวาง hover บนการด
4. เพลิดเพลินกับ effects! ✨

---

**สร้างโดย:** Magic Bento Integration  
**สถานะ:** ✅ พร้อมใช้งาน  
**Version:** 1.0.0  
**วันที่:** 19 พฤศจิกายน 2025
