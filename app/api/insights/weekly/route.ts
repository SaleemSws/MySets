import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { history, currentDate } = await req.json();

    const systemPrompt = `คุณคือ AI นักวิเคราะห์ภาพรวมรายสัปดาห์ หน้าที่ของคุณคือสรุปแนวโน้มการทำงานและความรู้สึกของ "คุณ" (ผู้ใช้งาน) 
ใช้ภาษาที่ "เป็นมืออาชีพ มีความปรารถนาดี และเข้าใจง่าย" 

ต้องตอบเป็นภาษาไทยเท่านั้น โดยเรียกผู้ใช้งานว่า "คุณ" เสมอ
ตอบกลับเป็นรูปแบบ JSON: { "weekly_score": "คะแนนเปอร์เซ็นต์", "mood_trend": "สรุปแนวโน้มความรู้สึก", "strategic_advice": "คำแนะนำเชิงกลยุทธ์ 2 ประโยค" }`;

    const prompt = `
วันที่ปัจจุบัน: ${currentDate}
ประวัติการทำงานและความรู้สึก 7 วันที่ผ่านมา: ${JSON.stringify(history)}

ช่วยวิเคราะห์แนวโน้มและให้คะแนนภาพรวมในสัปดาห์นี้ของคุณหน่อย
`;

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
        temperature: 0.4,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error("Groq API error");
    
    const result = await response.json();
    return NextResponse.json(JSON.parse(result.choices[0].message.content));
  } catch (error) {
    console.error("Weekly Insight Error:", error);
    return NextResponse.json({ error: "Failed to generate weekly insights" }, { status: 500 });
  }
}
