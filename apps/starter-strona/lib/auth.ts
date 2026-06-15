import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import {
  PostgresAuth,
  type CookieAdapter,
  type PostgresAuthRepository,
  requireAdminSession as requireAdminSessionCore,
} from "@moduly/auth-core";
import {
  adminSessions,
  adminUsers,
} from "@moduly/data-store";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { getPostgresClient } from "./db";

let authInstance: PostgresAuth | null = null;

function createPostgresAuthRepository(): PostgresAuthRepository {
  const { db } = getPostgresClient();

  return {
    async findAdminUserByEmail(email) {
      const [row] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, email))
        .limit(1);

      if (!row) return null;

      return {
        id: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
      };
    },

    async insertAdminSession(input) {
      await db.insert(adminSessions).values({
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      });
    },

    async deleteAdminSession(tokenHash) {
      await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
    },

    async hasActiveAdminSession(tokenHash) {
      const now = new Date().toISOString();
      const [row] = await db
        .select({ id: adminSessions.id })
        .from(adminSessions)
        .where(
          and(
            eq(adminSessions.tokenHash, tokenHash),
            gt(adminSessions.expiresAt, now),
          ),
        )
        .limit(1);

      return Boolean(row);
    },
  };
}

function resolveJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "[starter-strona] Brak AUTH_JWT_SECRET — ustaw zmienną w .env.local.",
    );
  }
  return secret;
}

/** Skonfigurowana instancja PostgresAuth (singleton). */
export function getPostgresAuth(): PostgresAuth {
  if (!authInstance) {
    authInstance = new PostgresAuth(
      {
        cookieName: getModulyConfig().auth.cookieName,
        jwtSecret: resolveJwtSecret(),
      },
      createPostgresAuthRepository(),
    );
  }
  return authInstance;
}

/** Adapter cookie Next.js App Router. */
export async function nextCookieAdapter(): Promise<CookieAdapter> {
  const store = await cookies();

  return {
    get(name) {
      return store.get(name)?.value;
    },
    set(name, value, options) {
      store.set(name, value, options);
    },
    delete(name) {
      store.delete(name);
    },
  };
}

/** Guard sesji admina — używaj w Server Actions panelu i module formularzy. */
export async function requireAdminSessionForPanel(): Promise<void> {
  const auth = getPostgresAuth();
  const cookieAdapter = await nextCookieAdapter();

  await requireAdminSessionCore(auth, async () => {
    const token = await cookieAdapter.get(getModulyConfig().auth.cookieName);
    return token ?? null;
  });
}
