import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { completedTasks, pendingTasks, reflections, currentDate } = await req.json();

    const systemPrompt = `คุณคือ AI ผู้ช่วยสรุปผลงานและสุขภาวะรายวัน หน้าที่ของคุณคือวิเคราะห์กิจกรรมและความรู้สึกของ "คุณ" (ผู้ใช้งาน) ในวันนี้
คุยด้วยภาษาที่ "สุภาพ เป็นกันเอง และเน้นการให้กำลังใจ" เหมือนเพื่อนสนิทที่คอยซัพพอร์ต

ต้องตอบเป็นภาษาไทยเท่านั้น โดยเรียกผู้ใช้งานว่า "คุณ" เสมอ
ตอบกลับเป็นรูปแบบ JSON: { "summary": "สรุปสั้นๆ 1-3 ประโยค", "analysis": "วิเคราะห์เจาะลึกเรื่องความสำเร็จ/ล้มเหลวและสภาพจิตใจของคุณ", "next_day_tips": ["ข้อแนะนำการปรับกิจกรรม 1", "ข้อแนะนำการปรับกิจกรรม 2","ข้อแนะนำการปรับกิจกรรม 3"] }`;

    const prompt = `
วันที่: ${currentDate}
งานที่ทำเสร็จแล้ว: ${JSON.stringify(completedTasks.map((t: any) => t.name))}
งานที่ค้างอยู่: ${JSON.stringify(pendingTasks.map((t: any) => t.name))}
ความรู้สึกวันนี้: ${JSON.stringify(reflections)}

วิเคราะห์ว่าวันนี้คุณทำงานครบไหม? สภาพจิตใจเป็นอย่างไร? และคุณควรเตรียมตัวอย่างไรสำหรับวันพรุ่งนี้?
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
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error("Groq API error");
    
    const result = await response.json();
    return NextResponse.json(JSON.parse(result.choices[0].message.content));
  } catch (error) {
    console.error("Today Insight Error:", error);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
