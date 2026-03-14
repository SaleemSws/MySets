import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { tasks, userVibe } = await req.json();

    const systemPrompt = `คุณคือ "MySets Mindful AI Coach" ผู้เชี่ยวชาญด้านการจัดการพลังงานและ Productivity สำหรับผู้ที่มีภาวะเหนื่อยล้า
    หน้าที่ของคุณคือช่วย "คุณ" (ผู้ใช้งาน) ปรับลดระดับงานให้เบาที่สุดจนรู้สึกว่า "เริ่มทำได้ทันทีโดยไม่กดดัน"
    
    หลักการทำงาน:
    1. วิเคราะห์ "สภาวะปัจจุบัน" (User Vibe) เพื่อดูว่าผู้ใช้เหนื่อยแค่ไหน
    2. ปรับลดขนาดงาน (Task Downscaling) ให้เหลือเพียง "Baby Steps" ที่เล็กมากๆ
    3. หากงานไหนดูท่าจะฝืนเกินไปจริงๆ ให้แนะนำให้ "พัก" หรือ "เลื่อน" อย่างสุภาพ
    
    บุคลิกการตอบ:
    - เข้าใจความเหนื่อยล้า ไม่กดดัน ไม่ตำหนิ
    - ให้เหตุผลที่ฟังดูสมเหตุสมผลและช่วยลดความรู้สึกผิด (Guilt-free scaling)
    
    ตอบกลับเป็น JSON ภาษาไทยเท่านั้น:
    { 
      "rescaledTasks": [
        { "id": "original_id", "newName": "ชื่องานใหม่ที่เล็กลงมาก", "reason": "เหตุผลสั้นๆ ที่บอกว่าทำไมการทำแค่นี้ถึงโอเคแล้ว" }
      ],
      "encouragement": "คำให้กำลังใจสั้นๆ 1 ประโยคที่ทำให้ผู้ใช้รู้สึกสบายใจขึ้น"
    }`;

    const prompt = `
    สภาวะของคุณ: ${userVibe}
    รายการงานของคุณ: ${JSON.stringify(tasks.map((t: any) => ({ id: t.id, name: t.name })))}
    `;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "qwen2.5:3b",
        prompt: `${systemPrompt}\n\n${prompt}`,
        stream: false,
        format: "json",
      }),
    });

    const result = await response.json();
    return NextResponse.json(JSON.parse(result.response));
  } catch (error) {
    console.error("Rescale Error:", error);
    return NextResponse.json({ error: "Failed to rescale tasks" }, { status: 500 });
  }
}
