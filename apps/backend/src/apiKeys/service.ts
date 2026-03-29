import { prisma } from "../lib/prisma";

export class ApiKeyService {
  static async createApiKey(name: string, userId: number) {
    const apiKey = `rf-${crypto.randomUUID().replace(/-/g, "")}`;

    const key = await prisma.apiKey.create({
      data: { userId, name, apiKey },
      select: { id: true, apiKey: true },
    });

    return key;
  }

  static async getApiKeys(userId: number) {
    const keys = await prisma.apiKey.findMany({
      where: { userId, deleted: false },
      select: {
        id: true,
        name: true,
        apiKey: true,
        disabled: true,
        lastUsed: true,
        creditsConsumed: true,
      },
      orderBy: { id: "desc" },
    });

    return keys;
  }

  static async updateApiKeyDisabled(id: number, userId: number, disabled: boolean) {
    const key = await prisma.apiKey.findFirst({
      where: { id, userId, deleted: false },
    });

    if (!key) throw new Error("API key not found");

    await prisma.apiKey.update({
      where: { id },
      data: { disabled },
    });
  }

  static async delete(id: number, userId: number) {
    const key = await prisma.apiKey.findFirst({
      where: { id, userId, deleted: false },
    });

    if (!key) throw new Error("API key not found");

    await prisma.apiKey.update({
      where: { id },
      data: { deleted: true },
    });
  }
}
