import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        isImportant: data.isImportant,
        isCompleted: data.isCompleted,
        dueDate: data.dueDate,
        time: data.time,
        myDayDate: data.myDayDate,
        note: data.note,
        status: data.status,
        reflection: data.reflection,
        subtasks: data.subtasks,
        // We can't directly map aiFeedback yet, we might need a separate relation or Json field
      }
    });
    
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("PATCH Task Error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.task.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Task Error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
