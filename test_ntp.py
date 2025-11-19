import socket
import struct
import time
import datetime

def get_ntp_time(host="time.navy.mi.th"):
    port = 123
    buf = 1024
    address = (host, port)
    
    # สร้าง NTP Packet ขนาด 48 bytes
    # \x1b คือ message ยืนยันขอเวลา (Client Request)
    msg = '\x1b' + 47 * '\0'

    # เชื่อมต่อผ่าน UDP (NTP ใช้ UDP)
    try:
        client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        client.settimeout(5) # ตั้งเวลา timeout 5 วินาที ถ้าเกินถือว่าต่อไม่ได้
        
        # ส่ง request
        start_time = time.time()
        client.sendto(msg.encode('utf-8'), address)
        
        # รอรับ response
        msg, address = client.recvfrom(buf)
        
        # NTP Protocol: ข้อมูลเวลาอยู่ที่ byte ที่ 40-43
        t = struct.unpack("!12I", msg)[10]
        
        # NTP เริ่มนับปี 1900 แต่ Unix/PC เริ่ม 1970
        # ต้องลบออก 2208988800 วินาที เพื่อแปลงเป็น Unix Time
        t -= 2208988800
        
        return t

    except socket.timeout:
        print(f"❌ หมดเวลาเชื่อมต่อ (Timeout) - ติดต่อ {host} ไม่ได้")
        return None
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        return None

if __name__ == "__main__":
    server = "time.navy.mi.th"
    print(f"📡 กำลังทดสอบดึงเวลาจาก: {server} ...")
    print("-" * 40)

    ntp_time = get_ntp_time(server)

    if ntp_time:
        # แปลงเป็นเวลาที่อ่านออกได้ (Local Time ของเครื่องคอมคุณ)
        local_time = datetime.datetime.fromtimestamp(ntp_time)
        
        print(f"✅ เชื่อมต่อสำเร็จ!")
        print(f"🕒 Raw Timestamp: {ntp_time}")
        print(f"📅 เวลาปัจจุบันที่ได้: {local_time.strftime('%d/%m/%Y %H:%M:%S')}")
        print("-" * 40)
        print("สรุป: Server ทำงานปกติ และ Network ของคุณอนุญาตให้ดึงเวลาได้")
    else:
        print("สรุป: การทดสอบล้มเหลว")