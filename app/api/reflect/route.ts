import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { taskId, habitName, status, reflection, date } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    const systemPrompt = `คุณคือ "MySets Mindful AI Coach" ผู้เชี่ยวชาญด้านจิตวิทยาเชิงบวกและการจัดการพลังงานชีวิต (Energy Management) 
    บุคลิกของคุณ: อบอุ่น, ใจดี, เข้าอกเข้าใจ (Empathetic), และให้กำลังใจเหมือนพี่สาวหรือเพื่อนสนิทที่หวังดี
    
    หน้าที่ของคุณ:
    1. วิเคราะห์อารมณ์ (Sentiment) จากสิ่งที่ผู้ใช้เขียนสะท้อนความรู้สึก (Reflection)
    2. ประเมินความเสี่ยงภาวะหมดไฟ (Burnout Risk) โดยดูจากระดับพลังงานและความกดดันในคำพูด
    3. ให้คำแนะนำ (Advice) ที่ "เจาะจง" กับสิ่งที่ผู้ใช้เขียนมาจริงๆ
    
    ตอบเป็น JSON ภาษาไทยเท่านั้น:
    { "sentiment_tag": "ระบุอารมณ์หลักสั้นๆ", "burnout_risk_level": "Low|Medium|High", "daily_actionable_advice": "คำแนะนำ 1-2 ประโยคที่อบอุ่นและตรงประเด็น" }`;
    
    const input = `Habit: ${habitName}\nStatus: ${status}\nReflection: ${reflection}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // ใช้รุ่นเล็กแต่เร็วมากสำหรับงานวิเคราะห์สั้นๆ
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq Error: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const aiAnalysis = JSON.parse(result.choices[0].message.content);

    // ปรับชื่อฟิลด์ให้ตรงกับที่จะใช้ใน UI และ DB
    const finalFeedback = {
      sentiment_tag: aiAnalysis.sentiment_tag || aiAnalysis.sentiment || "Unknown",
      burnout_risk_level: aiAnalysis.burnout_risk_level || aiAnalysis.burnoutRisk || "Low",
      daily_actionable_advice: aiAnalysis.daily_actionable_advice || aiAnalysis.aiAdvice || "สู้ๆ นะคะ"
    };

    // --- บันทึกลงฐานข้อมูล PostgreSQL ผ่าน Prisma ---
    const newLog = await prisma.habitLog.create({
      data: {
        taskId: taskId,
        date: date || new Date().toISOString().split('T')[0],
        status: status,
        reflection: reflection,
        sentiment: finalFeedback.sentiment_tag,
        burnoutRisk: finalFeedback.burnout_risk_level,
        aiAdvice: finalFeedback.daily_actionable_advice,
      },
    });

    // อัปเดตสถานะงานในตาราง Task
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: status,
        reflection: reflection,
        sentiment: finalFeedback.sentiment_tag,
        burnoutRisk: finalFeedback.burnout_risk_level,
        aiAdvice: finalFeedback.daily_actionable_advice,
      }
    });

    return NextResponse.json({
      ...finalFeedback,
      id: newLog.id
    });

  } catch (error) {
    console.error("Reflect Error:", error);
    return NextResponse.json({ 
      error: "Server Error: " + (error instanceof Error ? error.message : "Unknown")
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const logs = await prisma.habitLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: { name: true }
        }
      }
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
