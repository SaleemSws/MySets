import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { taskName } = await req.json();

    const systemPrompt = "ย่อยงานที่ได้รับให้เป็น 3-6 ขั้นตอนสั้นๆ ตอบกลับเป็น JSON เท่านั้น รูปแบบ: [\"ขั้นตอน 1\", \"ขั้นตอน 2\"]";
    
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "qwen2.5:3b",
        prompt: `${systemPrompt}\n\nงานที่ต้องย่อย: ${taskName}`,
        stream: false,
        format: "json",
        options: {
          temperature: 0.1,
          num_predict: 300 // รายการขั้นตอนไม่ควรยาวเกินนี้
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const result = await response.json();
    let text = result.response.trim();
    
    try {
      let subtasks = JSON.parse(text);
      
      // กรณี AI ตอบเป็น Object เช่น { "1": "อ่านหนังสือ", "2": "สรุป" }
      // เราจะดึงเอาเฉพาะ Value มาสร้างเป็น Array ใหม่
      if (!Array.isArray(subtasks) && typeof subtasks === 'object' && subtasks !== null) {
        // ลองดูว่ามี property ที่เป็น array อยู่ข้างในไหม เช่น { "steps": [...] }
        const foundArray = Object.values(subtasks).find(v => Array.isArray(v));
        if (foundArray) {
          subtasks = foundArray;
        } else {
          // ถ้าไม่มี array เลย ให้ดึงเอาทุุก value ที่เป็น string มาต่อกันเป็น array
          subtasks = Object.values(subtasks).filter(v => typeof v === 'string');
        }
      }

      // ตรวจสอบความถูกต้องสุดท้าย
      if (!Array.isArray(subtasks) || subtasks.length === 0) {
        throw new Error("Could not extract subtasks from AI response");
      }

      return NextResponse.json(subtasks);
    } catch (e) {
      // ถ้า JSON.parse พัง หรือไม่ได้ array ให้ลองใช้วิธีดิบๆ (Regex) สกัดเอาข้อความในฟันหนูออกมา
      const matches = text.match(/"([^"]+)"/g);
      if (matches && matches.length > 2) {
        // กรองเอาคำที่ไม่ใช่คีย์ (เช่น ขั้นที่ 1) ออก หรือถ้ามันปนกันก็เอามาทั้งหมดแล้วให้ผู้ใช้ดูเอง
        const rawSteps = matches.map(m => m.replace(/"/g, ""));
        // ถ้ามันส่งมาเป็นคู่ "key": "value" เราจะพยายามเอาเฉพาะ value (ตัวที่ 2, 4, 6...)
        if (rawSteps.length >= 4 && rawSteps[0].includes("ขั้น")) {
            const valuesOnly = rawSteps.filter((_, i) => i % 2 !== 0);
            return NextResponse.json(valuesOnly);
        }
        return NextResponse.json(rawSteps.slice(0, 5));
      }
      throw new Error("AI returned invalid format");
    }
  } catch (error) {
    console.error("Final Breakdown Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
