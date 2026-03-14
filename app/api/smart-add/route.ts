import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    
    const now = new Date();
    const daysThai = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    
    // ข้อมูลเวลาปัจจุบันที่แน่นอน
    const todayDate = now.toISOString().split('T')[0];
    const dayNameToday = daysThai[now.getDay()];
    const currentTime = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // สร้างตารางอ้างอิงวันที่แบบเจาะจง
    let dateContext = `วันนี้คือวัน${dayNameToday}ที่ ${todayDate}\n`;
    for (let i = 0; i < 10; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dName = daysThai[d.getDay()];
      const alias = i === 0 ? " (วันนี้)" : i === 1 ? " (พรุ่งนี้)" : i === 2 ? " (มะรืน)" : "";
      dateContext += `- วัน${dName}${alias}: ${dStr}\n`;
    }

    const systemPrompt = `คุณคือ AI สกัดข้อมูลตารางงาน (JSON ONLY)
ข้อมูลอ้างอิง:
${dateContext}
เวลาปัจจุบัน: ${currentTime} น.

หน้าที่: สกัดกิจกรรมจากข้อความผู้ใช้เป็น JSON Array
กฎเหล็กในการกำหนด dueDate:
1. หากผู้ใช้พูดว่า "วันนี้" หรือไม่ระบุวัน ให้ใช้: "${todayDate}"
2. หากผู้ใช้ระบุชื่อวัน (เช่น "วันจันทร์") ให้เลือกวันที่จากรายการด้านบนที่ตรงกับชื่อวันนั้นที่ใกล้ที่สุด
3. หากระบุเวลา (เช่น "9 โมง") ให้แปลงเป็น HH:mm (เช่น 09:00)
4. รูปแบบคำตอบ JSON เท่านั้น: [{"name":"..","time":"HH:mm","category":"..","icon":"..","dueDate":"YYYY-MM-DD"}]`;
    
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "qwen2.5:3b",
        prompt: `${systemPrompt}\n\nข้อความผู้ใช้: "${prompt}"`,
        stream: false,
        format: "json",
        options: {
          temperature: 0,
          num_predict: 800
        }
      }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

    const result = await response.json();
    let text = result.response.trim();
    
    // สกัดเฉพาะ JSON Array
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) text = text.substring(start, end + 1);

    try {
      let data = JSON.parse(text);
      if (!Array.isArray(data)) data = [data];
      return NextResponse.json(data);
    } catch (e) {
      console.error("JSON Parse Error. Raw:", text);
      return NextResponse.json({ error: "AI Format Error" }, { status: 500 });
    }
  } catch (error) {
    console.error("Smart Add Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
