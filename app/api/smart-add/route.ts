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

กฎการคำนวณ relative_days (สำคัญมาก - ทำตามตารางนี้เท่านั้น):
1. คำบอกวันพื้นฐาน: "วันนี้"=0, "พรุ่งนี้"=1, "มะรืน"=2
2. คำบอกช่วงเวลาของวันนี้: "เช้านี้", "เที่ยงนี้", "เย็นนี้", "คืนนี้" -> relative_days: 0
3. ตารางอ้างอิงชื่อวัน (คำนวณมาให้แล้ว):
${dayMapInstructions}

หน้าที่: สกัดกิจกรรม "ทั้งหมด" เป็น JSON Array
- name: ชื่องาน
- relative_days: เลขจำนวนเต็มตามกฎด้านบน
- target_time: เวลา (HH:mm) หรือ null
- category: Work, Health, Study, Social, Personal

ตัวอย่าง: "เสาร์นี้ไปวิ่ง" -> [{"name":"ไปวิ่ง","relative_days": ${currentDayIdx <= 6 ? 6 - currentDayIdx : 0},"target_time":null,"category":"Health"}]
JSON ONLY ห้ามมีข้อความอื่น!`;

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
