import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { completedTasks, pendingTasks, reflections, currentDate } = await req.json();

    const systemPrompt = `คุณคือ AI ผู้ช่วยสรุปผลงานและสุขภาวะรายวัน หน้าที่ของคุณคือวิเคราะห์กิจกรรมและความรู้สึกของ "คุณ" (ผู้ใช้งาน) ในวันนี้
คุยด้วยภาษาที่ "สุภาพ เป็นกันเอง และเน้นการให้กำลังใจ" เหมือนเพื่อนสนิทที่คอยซัพพอร์ต

**เป้าหมายการวิเคราะห์:**
1. ตรวจสอบว่างานส่วนใหญ่ของ "คุณ" สำเร็จหรือไม่อย่างไร และหาสาเหตุจากบันทึกความรู้สึกที่คุณเขียนไว้
2. หากงานไม่สำเร็จส่วนใหญ่ ให้แนะนำวิธีปรับเปลี่ยนพฤติกรรมหรือ "ประเภทกิจกรรม" ให้เหมาะสมกับสภาพพลังงานของคุณในวันนั้น (เช่น ถ้ารู้สึกล้า ให้แนะนำให้คุณย้ายงานยากไปวันอื่น และทำสมาธิสั้นๆ แทน)
3. หากงานสำเร็จดี ให้วิเคราะห์ปัจจัยบวกเพื่อนำไปปรับใช้กับวันพรุ่งนี้ของคุณ

**กฎเหล็กด้านความปลอดภัย:**
1. เน้นวิเคราะห์เฉพาะความสัมพันธ์ระหว่าง "ความรู้สึก" กับ "ความสำเร็จของงาน" ของคุณเท่านั้น
2. ห้ามวินิจฉัยสุขภาพจิตหรือให้คำแนะนำทางการแพทย์เชิงลึกเด็ดขาด

ต้องตอบเป็นภาษาไทยเท่านั้น โดยเรียกผู้ใช้งานว่า "คุณ" เสมอ
ตอบกลับเป็นรูปแบบ JSON: { "summary": "สรุปสั้นๆ 1-3 ประโยค", "analysis": "วิเคราะห์เจาะลึกเรื่องความสำเร็จ/ล้มเหลวและสภาพจิตใจของคุณ", "next_day_tips": ["ข้อแนะนำการปรับกิจกรรม 1", "ข้อแนะนำการปรับกิจกรรม 2","ข้อแนะนำการปรับกิจกรรม 3"] }`;

    const prompt = `
วันที่: ${currentDate}
งานที่คุณทำเสร็จแล้ว (${completedTasks.length} รายการ): ${JSON.stringify(completedTasks.map((t: any) => t.name))}
งานที่คุณยังค้างอยู่ (${pendingTasks.length} รายการ): ${JSON.stringify(pendingTasks.map((t: any) => t.name))}
ความรู้สึกของคุณวันนี้: ${JSON.stringify(reflections)}

วิเคราะห์ว่าวันนี้คุณทำงานครบไหม? สภาพจิตใจเป็นอย่างไร? และคุณควรเตรียมตัวอย่างไรสำหรับวันพรุ่งนี้?
`;

    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "qwen2.5:3b",
        prompt: `${systemPrompt}\n\n${prompt}`,
        stream: false,
        format: "json",
        options: { 
          temperature: 0.3,
          num_predict: 500 // บทวิเคราะห์รายวันใช้ความยาวปานกลาง
        }
      }),
    });

    const result = await response.json();
    let text = result.response.trim();
    
    // ดึงเฉพาะ JSON เผื่อ AI แถมข้อความ
    const match = text.match(/\{.*\}/s);
    if (match) text = match[0];

    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error("Today Insight Error:", error);
    return NextResponse.json({ error: "Failed to generate today insights" }, { status: 500 });
  }
}
