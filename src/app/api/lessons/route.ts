import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import lessonsData from "@/data/lessons.json";

export async function GET() {
  try {
    const lessons = await prisma.lesson.findMany({
      include: {
        challenges: true,
      },
      orderBy: {
        level: "asc",
      },
    });

    if (lessons.length > 0) {
      return NextResponse.json({ success: true, source: "database", data: lessons });
    }
  } catch (err) {
    console.warn("Database fetch failed, serving static fallback:", err);
  }

  return NextResponse.json({ success: true, source: "static", data: lessonsData });
}
