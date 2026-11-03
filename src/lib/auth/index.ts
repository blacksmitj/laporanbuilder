import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const ac = createAccessControl(defaultStatements);
const adminRole = ac.newRole(adminAc.statements);
const operatorRole = ac.newRole(userAc.statements);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "operator",
        input: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [
    admin({
      ac,
      roles: {
        admin: adminRole,
        operator: operatorRole,
      },
      defaultRole: "operator",
      adminRoles: ["admin"],
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
