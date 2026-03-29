import { t } from "elysia";

export const AuthModel = {
  signupSchema: t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 6 }),
  }),

  signupResponseSchema: t.Object({
    id: t.String(),
  }),

  signupFailedResponseSchema: t.Object({
    message: t.String(),
  }),

  signinSchema: t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 6 }),
  }),

  signinResponseSchema: t.Object({
    message: t.String(),
  }),

  signinFailureSchema: t.Object({
    message: t.String(),
  }),

  profileResponseSchema: t.Object({
    id: t.Number(),
    email: t.String(),
    credits: t.Number(),
  }),

  profileResponseErrorSchema: t.Object({
    message: t.String(),
  }),
};
