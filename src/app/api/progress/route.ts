import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { completedLessons, totalScore } = body;

    // Get or create demo user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "engineer@systemdesignquest.io",
          name: "Cloud Architect",
        },
      });
    }

    if (Array.isArray(completedLessons) && user) {
      for (const lessonId of completedLessons) {
        const existing = await prisma.progress.findFirst({
          where: { userId: user.id, lessonId },
        });

        if (!existing) {
          await prisma.progress.create({
            data: {
              userId: user.id,
              lessonId,
              completed: true,
              score: totalScore || 100,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: "Progress synced with PostgreSQL" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
