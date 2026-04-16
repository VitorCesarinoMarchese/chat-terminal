import db from "../../../src/config/db";

export async function resetTestDatabase() {
  await db.message.deleteMany();
  await db.member.deleteMany();
  await db.chat.deleteMany();
  await db.friendship.deleteMany();
  await db.user.deleteMany();
}

export async function disconnectTestDatabase() {
  await db.$disconnect();
}

export { db };
