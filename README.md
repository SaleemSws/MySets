# 🚀 MySets: Mindful AI Coach Task Manager

**MySets** คือแอปพลิเคชันบริหารจัดการงาน (Task Management) ยุคใหม่ที่ไม่ได้มีไว้แค่จดรายการสิ่งที่ต้องทำ แต่ยังมาพร้อมกับ **AI Mindful Coach** ที่ช่วยดูแลสภาวะจิตใจ พลังงานชีวิต และช่วยให้คุณบรรลุเป้าหมายได้อย่างมีความสุข

---

## ✨ ฟีเจอร์หลัก (Key Features)

### 🧠 1. Smart Add (Fast & Precise)
เพิ่มงานด้วยภาษาพูด (Natural Language) AI จะสกัดข้อมูล ชื่องาน, วันที่, เวลา และหมวดหมู่ให้โดยอัตโนมัติ
- **Hybrid Precision:** ใช้เทคนิค Hybrid Approach (AI Intent + TypeScript Logic) เพื่อความแม่นยำของวันที่ 100% ไม่ว่าจะเป็น "เสาร์หน้า", "เย็นนี้" หรือ "มะรืนนี้"
- **Bulk Add:** สามารถพิมพ์สั่งหลายงานพร้อมกันในประโยคเดียว

### 🧘 2. AI Reflection & Mood Tracking
ทุกงานที่ทำสำเร็จ คุณสามารถสะท้อนความรู้สึก (Reflection) เพื่อให้ AI ช่วยวิเคราะห์:
- **Sentiment Analysis:** ตรวจจับอารมณ์ความรู้สึก
- **Burnout Risk:** ประเมินความเสี่ยงภาวะหมดไฟ (Low, Medium, High)
- **Actionable Advice:** รับคำแนะนำที่อบอุ่นและตรงจุดจาก AI Coach

### 📉 3. AI Task Rescale (Energy Management)
หาก AI ตรวจพบว่าคุณมีระดับพลังงานต่ำหรือเหนื่อยล้า ระบบจะเสนอให้ **"ปรับลดขนาดงาน" (Downscaling)** เพื่อย่อยงานให้เล็กลงจนคุณรู้สึกว่าเริ่มทำได้ทันทีโดยไม่กดดัน

### 📋 4. Intelligent Organization
- **My Day:** ระบบวางแผนรายวันที่เรียบง่ายแต่ทรงพลัง
- **AI Breakdown:** ย่อยงานใหญ่ให้กลายเป็นขั้นตอนเล็กๆ (Subtasks) ที่ทำตามได้จริง
- **Automatic Category:** จัดหมวดหมู่งานให้อัตโนมัติ (Work, Health, Study, Social, Personal)

---

## 🛠 Tech Stack

- **Frontend:** [Next.js 15+](https://nextjs.org/) (App Router), TypeScript, Tailwind CSS
- **Icons:** [Lucide React](https://lucide.dev/)
- **Database:** [PostgreSQL](https://www.postgresql.org/) (Supabase)
- **ORM:** [Prisma 7.5.0+](https://www.prisma.io/) (รองรับ Driver Adapters ล่าสุด)
- **AI Engine:** [Groq Cloud API](https://groq.com/) (Llama 3.3 70B Versatile & Llama 3.1 8B Instant)

---

## 🚀 เริ่มต้นใช้งาน (Getting Started)

### 1. Clone โปรเจกต์
```bash
git clone https://github.com/your-username/mysets.git
cd mysets
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables
สร้างไฟล์ `.env.local` ใน Root Directory และใส่ค่าดังนี้:

```env
# Database Connection (Supabase/PostgreSQL)
DATABASE_URL="postgres://postgres.[YOUR_PROJECT_ID]:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

# Groq AI API Key (ขอได้ที่ console.groq.com)
GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxx"
```

### 4. Setup Database
ทำการ Migration เพื่อสร้างตารางและคอลัมน์ที่จำเป็น:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start Development Server
```bash
npm run dev
```
เปิดบราวเซอร์ไปที่ `http://localhost:3000`

---

## 💡 แนวคิดการพัฒนา (Development Philosophy)

โปรเจกต์นี้ให้ความสำคัญกับ **"ความเร็ว" (Speed)** และ **"ความแม่นยำ" (Accuracy)**:
- เปลี่ยนจาก Local LLM (Ollama) มาเป็น **Groq API** เพื่อให้การตอบสนองแทบจะเป็น Real-time
- ใช้ **TypeScript** ในการคำนวณวันเวลา (Date Logic) แทน AI เพื่อป้องกันข้อผิดพลาดจาก Timezone หรือการนับวันผิดของ LLM
- ออกแบบ UI ให้เป็น **Client-Centric** โดยอิงเวลาจากหน้าจอผู้ใช้เป็นหลักเพื่อให้ "วันนี้" ของผู้ใช้และ AI ตรงกันเสมอ

---


