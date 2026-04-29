import { prisma } from "../lib/prisma";
import { publishProfileUpdate } from "../lib/redis";

export class PaymentsService {
  static async onramp(userId: number) {
    const ONRAMP_AMOUNT = 1000;

    const [, updatedUser] = await prisma.$transaction([
      prisma.onrampTransaction.create({
        data: {
          userId,
          amount: ONRAMP_AMOUNT,
          status: "success",
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: ONRAMP_AMOUNT } },
        select: { credits: true },
      }),
    ]);

    await publishProfileUpdate(userId);

    return updatedUser.credits;
  }
}
