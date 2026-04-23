import { prisma } from "../lib/prisma";

export class PaymentsService {
  static async onramp(userId: number) {
    const ONRAMP_AMOUNT = 1000;

    const result = await prisma.$transaction(async (tx) => {
      await tx.onrampTransaction.create({
        data: {
          userId,
          amount: ONRAMP_AMOUNT,
          status: "success",
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: ONRAMP_AMOUNT } },
        select: { credits: true },
      });

      return updatedUser.credits;
    });

    return result;
  }
}
