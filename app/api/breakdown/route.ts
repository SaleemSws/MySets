import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { taskName } = await req.json();

    const systemPrompt = "คุณคือผู้เชี่ยวชาญด้านการจัดการเวลา หน้าที่ของคุณคือย่อยงานที่ได้รับให้เป็น 3-6 ขั้นตอนสั้นๆ ที่ทำตามได้ทันที ตอบกลับเป็น JSON ในรูปแบบ: {\"steps\": [\"ขั้นตอน 1\", \"ขั้นตอน 2\"]}";
    
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
          { role: "user", content: `งานที่ต้องย่อย: ${taskName}` }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq Error: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const content = JSON.parse(result.choices[0].message.content);
    
    // ดึง Array ของขั้นตอนออกมา
    const steps = content.steps || content.subtasks || Object.values(content).find(v => Array.isArray(v)) || [];
    
    return NextResponse.json(steps);
  } catch (error) {
    console.error("Breakdown Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server Error" }, { status: 500 });
  }
}
