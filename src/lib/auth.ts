import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

let _auth: ReturnType<typeof betterAuth> | null = null;

function createAuth() {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    },
    user: {
      additionalFields: {
        technicalLevel: {
          type: "string",
          required: false,
          input: true,
        },
        onboardingCompleted: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: true,
        },
      },
    },
    trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  });
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    if (!_auth) {
      _auth = createAuth();
    }
    return (_auth as Record<string | symbol, unknown>)[prop];
  },
  has(_target, prop) {
    if (!_auth) {
      _auth = createAuth();
    }
    return prop in (_auth as Record<string | symbol, unknown>);
  },
});
