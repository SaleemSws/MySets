import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: { logs: true }
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET Tasks API Error:", error);
    // Return JSON error instead of letting Next.js throw HTML error page
    return NextResponse.json({ 
      error: "Database error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const newTask = await prisma.task.create({
      data: {
        name: data.name,
        category: data.category || "Personal",
        isImportant: data.isImportant || false,
        isCompleted: data.isCompleted || false,
        dueDate: data.dueDate,
        time: data.time,
        myDayDate: data.myDayDate,
        note: data.note,
        subtasks: data.subtasks,
      }
    });
    return NextResponse.json(newTask);
  } catch (error) {
    console.error("POST Task API Error:", error);
    return NextResponse.json({ 
      error: "Failed to create task", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
