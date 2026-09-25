import { Prisma, PrismaClient } from "@prisma/client";
import lessonsData from "../src/data/lessons.json";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed default demo user
  const user = await prisma.user.upsert({
    where: { email: "engineer@systemdesignquest.io" },
    update: {},
    create: {
      email: "engineer@systemdesignquest.io",
      name: "Cloud Architect",
    },
  });

  console.log(`Created/Verified demo user: ${user.name} (${user.id})`);

  for (const lesson of lessonsData) {
    const upsertedLesson = await prisma.lesson.upsert({
      where: { id: lesson.id },
      update: {
        title: lesson.title,
        description: lesson.description,
        level: lesson.level,
        content: lesson as unknown as Prisma.InputJsonValue,
      },
      create: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        level: lesson.level,
        content: lesson as unknown as Prisma.InputJsonValue,
      },
    });

    if (lesson.challenge) {
      await prisma.challenge.upsert({
        where: { id: lesson.challenge.id },
        update: {
          question: lesson.challenge.question,
          options: lesson.challenge.options as unknown as Prisma.InputJsonValue,
          answer: lesson.challenge.options.find((o) => o.isCorrect)?.label || "",
          lessonId: upsertedLesson.id,
        },
        create: {
          id: lesson.challenge.id,
          question: lesson.challenge.question,
          options: lesson.challenge.options as unknown as Prisma.InputJsonValue,
          answer: lesson.challenge.options.find((o) => o.isCorrect)?.label || "",
          lessonId: upsertedLesson.id,
        },
      });
    }

    console.log(`Synced lesson ${lesson.title}`);
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
