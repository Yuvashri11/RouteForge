import { prisma } from "../lib/prisma";

export class AuthService {
  static async signup(email: string, password: string): Promise<string> {
    try {
      const user = await prisma.user.create({
        data: {
          email,
          password: await Bun.password.hash(password),
        },
      });
      return user.id.toString();
    } catch (err) {
      throw new Error("Email already exists");
    }
  }

  static async signin(
    email: string,
    password: string
  ): Promise<{ correctCredentials: boolean; userId?: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { correctCredentials: false };
    }

    const valid = await Bun.password.verify(password, user.password);
    if (!valid) {
      return { correctCredentials: false };
    }

    return { correctCredentials: true, userId: user.id.toString() };
  }

  static async getUserDetails(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, credits: true },
    });

    return user;
  }
}
