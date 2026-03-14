import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const currentDate = new Date().toISOString().split('T')[0];

    const systemPrompt = `คุณคือ AI ผู้ช่วยจัดตารางชีวิตระดับมืออาชีพ หน้าที่ของคุณคือสกัด "ทุกกิจกรรม" ออกจากประโยคของผู้ใช้เป็น JSON Array
กฎเหล็ก:
1. หากผู้ใช้พิมพ์หลายงานในประโยคเดียว (สังเกตคำเชื่อม เช่น 'และ', 'แล้วก็', ',', 'ตอน') ให้แยกเป็นหลาย Object ใน Array
2. หากระบุเวลาแต่ไม่ระบุวัน ให้ถือว่าเป็นวันนี้ (${currentDate})
3. รูปแบบเวลา: HH:mm (เช้า=08:00, เที่ยง=12:00, บ่าย=14:00, เย็น=17:00, ค่ำ=20:00)

ตัวอย่างการทำงาน:
- ผู้ใช้: "8 โมงวิ่งและ 10 โมงอ่านหนังสือ"
  ผลลัพธ์: [{"name":"วิ่ง","time":"08:00","dueDate":"${currentDate}"...}, {"name":"อ่านหนังสือ","time":"10:00","dueDate":"${currentDate}"...}]
- ผู้ใช้: "พรุ่งนี้เช้าซักผ้าและตอนเย็นไปห้าง"
  ผลลัพธ์: [{"name":"ซักผ้า","time":"08:00","dueDate":"(พรุ่งนี้)"...}, {"name":"ไปห้าง","time":"17:00","dueDate":"(พรุ่งนี้)"...}]

ตอบกลับเป็น JSON Array เท่านั้น: [{ "name": "...", "time": "...", "category": "...", "icon": "...", "dueDate": "..." }]`;
    
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "qwen2.5:3b",
        prompt: `${systemPrompt}\n\nข้อความผู้ใช้: "${prompt}"`,
        stream: false,
        format: "json",
        options: {
          temperature: 0.1,
          num_predict: 200, // จำกัดความยาวไม่ให้เกิน 200 tokens
          top_p: 0.9
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const result = await response.json();
    let text = result.response.trim();
    
    const match = text.match(/\[.*\]/s);
    if (match) {
      text = match[0];
    }

    let data = JSON.parse(text);
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Smart Add Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: "AI Error: " + message 
    }, { status: 500 });
  }
}
