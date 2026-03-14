import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { history, currentDate } = await req.json();

    const systemPrompt = `คุณคือ AI นักวิเคราะห์ภาพรวมรายสัปดาห์ หน้าที่ของคุณคือสรุปแนวโน้มการทำงานและความรู้สึกของ "คุณ" (ผู้ใช้งาน) 
ใช้ภาษาที่ "เป็นมืออาชีพ มีความปรารถนาดี และเข้าใจง่าย" 
**กฎสำคัญ:**
1. วิเคราะห์ "Pattern" พฤติกรรมจากการทำงานของคุณ (เช่น ช่วงเวลาที่คุณมีสมาธิสูงสุด หรือประเภทงานที่คุณมักจะทำไม่สำเร็จ)
2. ห้ามก้าวล่วงไปถึงการวิเคราะห์สุขภาพจิตเชิงลึกหรือการบำบัด
3. เน้นการให้คำแนะนำเชิงกลยุทธ์เพื่อพัฒนาการจัดการเวลาและการสร้างนิสัยที่ดีของคุณ

ต้องตอบเป็นภาษาไทยเท่านั้น โดยเรียกผู้ใช้งานว่า "คุณ" เสมอ
ตอบกลับเป็นรูปแบบ JSON: { "weekly_score": "คะแนนเป็นเปอร์เซ็นต์ (เช่น 85%)", "mood_trend": "สรุปแนวโน้มความรู้สึกในการทำงานของคุณในสัปดาห์นี้", "strategic_advice": "คำแนะนำเชิงกลยุทธ์ 2 ประโยคสำหรับคุณ" }`;

    const prompt = `
วันที่ปัจจุบัน: ${currentDate}
ประวัติการทำงานและความรู้สึกของคุณใน 7 วันที่ผ่านมา:
${JSON.stringify(history)}

ช่วยวิเคราะห์แนวโน้ม (Trends) และให้คะแนนภาพรวมในสัปดาห์นี้ของคุณหน่อย
`;

    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "qwen2.5:3b",
        prompt: `${systemPrompt}\n\n${prompt}`,
        stream: false,
        format: "json",
        options: { 
          temperature: 0.4,
          num_predict: 600 // สรุปรายสัปดาห์ต้องการความละเอียดหน่อย
        }
      }),
    });

    const result = await response.json();
    let text = result.response.trim();
    
    const match = text.match(/\{.*\}/s);
    if (match) text = match[0];

    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error("Weekly Insight Error:", error);
    return NextResponse.json({ error: "Failed to generate weekly insights" }, { status: 500 });
  }
}
