import jwt from "@elysiajs/jwt";
import Elysia from "elysia";
import { PaymentsModel } from "./models";
import { PaymentsService } from "./service";

export const paymentRoutes = new Elysia({ prefix: "/payments" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
    })
  )
  .resolve(async ({ cookie: { auth }, status, jwt }) => {
    if (!auth) {
      return status(401);
    }

    const decoded = await jwt.verify(auth.value as string);

    if (!decoded || !decoded.userId) {
      return status(401);
    }

    return {
      userId: decoded.userId as string,
    };
  })
  .post(
    "/onramp",
    async ({ userId, status }) => {
      try {
        const credits = await PaymentsService.onramp(Number(userId));
        return {
          message: "1000 credits added successfully",
          credits,
        };
      } catch (e) {
        console.error(e);
        return status(500, {
          message: "Failed to process onramp",
        });
      }
    },
    {
      response: {
        200: PaymentsModel.onrampResponseSchema,
        500: PaymentsModel.errorResponseSchema,
      },
    }
  );
