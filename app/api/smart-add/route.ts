import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, localDate, localDayName, localTime } = await req.json();
    
    // 1. เตรียมข้อมูลวันที่และสร้างตารางอ้างอิง (Reference Table)
    const [year, month, day] = localDate.split('-').map(Number);
    const daysThai = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const currentDayIdx = daysThai.indexOf(localDayName.replace('วัน', ''));
    
    // สร้างตารางบอก AI ว่าวันไหนต้องบวกกี่วัน (Relative Days Map)
    let dayMapInstructions = "";
    for (let i = 0; i < 7; i++) {
      const targetDayIdx = i;
      let offset = targetDayIdx - currentDayIdx;
      if (offset < 0) offset += 7; // ถ้าวันที่จะไปถึงผ่านมาแล้วในสัปดาห์นี้ ให้ถือว่าเป็นสัปดาห์หน้า (หรือสัปดาห์ปัจจุบันที่กำลังจะถึง)
      
      // กรณีพิเศษ: ถ้าเป็นวันนี้ (offset 0) แต่ผู้ใช้พูดชื่อวัน มักหมายถึงวันนี้หรือสัปดาห์หน้า
      // แต่เพื่อให้แม่นยำ เราจะบอก AI ตรงๆ
      dayMapInstructions += `- หากระบุ "วัน${daysThai[i]}": ให้ใช้ relative_days: ${offset}\n`;
      dayMapInstructions += `- หากระบุ "วัน${daysThai[i]}หน้า": ให้ใช้ relative_days: ${offset + 7}\n`;
    }

    const systemPrompt = `คุณคือ AI ผู้ช่วยสกัดข้อมูลงาน (JSON ONLY)
ปัจจุบันคือ: วัน${localDayName}ที่ ${localDate} เวลา ${localTime} น.

หน้าที่: สกัดกิจกรรม "ทั้งหมด" เป็น JSON Array

กฎการสกัดเวลาภาษาไทย (สำคัญมาก):
- "ทุ่ม" (1-6 ทุ่ม): บ่ายโมง+6 ชม. เช่น 1 ทุ่ม=19:00, 3 ทุ่ม=21:00, เที่ยงคืน=00:00
- "บ่าย" (บ่าย 1-4): +12 ชม. เช่น บ่ายโมง=13:00, บ่าย 3=15:00
- "เย็น" (4-6 โมงเย็น): +12 ชม. เช่น 5 โมงเย็น=17:00
- "โมงเช้า" (7-11 โมง): ใช้เลขนั้นตรงๆ หรือ +0 เช่น 9 โมง=09:00
- "ตี" (ตี 1-5): ใช้เลขนั้นตรงๆ เช่น ตี 3=03:00

กฎการคำนวณ relative_days:
1. คำบอกวันพื้นฐาน: "วันนี้"=0, "พรุ่งนี้"=1, "มะรืน"=2
2. คำบอกช่วงเวลาของวันนี้: "เช้านี้", "เที่ยงนี้", "เย็นนี้", "คืนนี้" -> relative_days: 0
3. ตารางอ้างอิงชื่อวัน:
${dayMapInstructions}

รูปแบบคำตอบ:
- name: ชื่องาน
- relative_days: เลขจำนวนเต็ม
- target_time: เวลา (HH:mm) ระบบ 24 ชม.
- category: Work, Health, Study, Social, Personal

ตัวอย่าง:
"3 ทุ่มอ่านหนังสือ" -> [{"name":"อ่านหนังสือ","relative_days":0,"target_time":"21:00","category":"Study"}]
"บ่าย 3 ประชุม" -> [{"name":"ประชุม","relative_days":0,"target_time":"15:00","category":"Work"}]
JSON ONLY ห้ามอธิบาย!`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0, // ปรับเป็น 0 เพื่อความแม่นยำสูงสุด ไม่ให้ AI คิดเองเออเอง
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error(`Groq Error`);

    const result = await response.json();
    let extractedData = JSON.parse(result.choices[0].message.content);
    
    if (!Array.isArray(extractedData)) {
      const keys = Object.keys(extractedData);
      extractedData = Array.isArray(extractedData[keys[0]]) ? extractedData[keys[0]] : [extractedData];
    }

    // 3. Hybrid Logic: คำนวณวันที่จริงจากเลข offset (TypeScript แม่นยำ 100%)
    const processedTasks = extractedData.map((item: any) => {
      const taskName = item.name || item.task || "Untitled Task";
      const targetDate = new Date(year, month - 1, day + (Number(item.relative_days) || 0));
      
      const dueDate = targetDate.getFullYear() + "-" + 
                    String(targetDate.getMonth() + 1).padStart(2, '0') + "-" + 
                    String(targetDate.getDate()).padStart(2, '0');
      
      return {
        name: taskName,
        time: item.target_time || item.time || null,
        category: item.category || "Personal",
        dueDate: dueDate
      };
    });

    return NextResponse.json(processedTasks);
  } catch (error) {
    console.error("Smart Add Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
