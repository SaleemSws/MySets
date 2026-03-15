import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { tasks, userVibe } = await req.json();

    const systemPrompt = `คุณคือ "MySets Mindful AI Coach" ผู้เชี่ยวชาญด้านการจัดการพลังงาน
หน้าที่คือช่วย "คุณ" ปรับลดระดับงานให้เบาที่สุดจนรู้สึกว่า "เริ่มทำได้ทันทีโดยไม่กดดัน"
หลักการ: ปรับลดขนาดงาน (Task Downscaling) ให้เหลือเพียง "Baby Steps" ที่เล็กมากๆ

ตอบกลับเป็น JSON ภาษาไทยเท่านั้น:
{ 
  "rescaledTasks": [
    { "id": "original_id", "newName": "ชื่องานใหม่ที่เล็กลงมาก", "reason": "เหตุผลสั้นๆ" }
  ],
  "encouragement": "คำให้กำลังใจ 1 ประโยค"
}`;

    const prompt = `
สภาวะของคุณ: ${userVibe}
รายการงานของคุณ: ${JSON.stringify(tasks.map((t: any) => ({ id: t.id, name: t.name })))}
`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error("Groq API error");

    const result = await response.json();
    return NextResponse.json(JSON.parse(result.choices[0].message.content));
  } catch (error) {
    console.error("Rescale Error:", error);
    return NextResponse.json({ error: "Failed to rescale tasks" }, { status: 500 });
  }
}
