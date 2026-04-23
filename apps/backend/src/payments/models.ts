import { t } from "elysia";

export const PaymentsModel = {
  onrampResponseSchema: t.Object({
    message: t.String(),
    credits: t.Number(),
  }),

  errorResponseSchema: t.Object({
    message: t.String(),
  }),
};
