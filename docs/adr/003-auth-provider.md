# ADR 003: AuthProvider — MedusaAuth vs PostgresAuth

**Status:** Zaakceptowany  
**Data:** 2026-06-15  
**Kontekst:** Panel administracyjny wymaga uwierzytelniania. Dwa startery mają różne backendy.

## Problem

Czy panel magazynu powinien zawsze logować przez Medusa Admin API, czy wspierać lekką tabelę `admin_users` w Postgres?

## Decyzja

Interfejs `AuthProvider` (`@moduly/types`) z dwiema implementacjami w `@moduly/auth-core`:

| Implementacja | Starter | Mechanizm |
|---------------|---------|-----------|
| `PostgresAuth` | `starter-strona` | Argon2 + JWT + tabela `admin_sessions` |
| `MedusaAuth` | `starter-sklep` | Medusa `/auth/user/emailpass` + cookie token |

Wybór w `moduly.config.ts`:

```ts
auth: {
  provider: "postgres", // | "medusa"
  cookieName: "moduly_admin_session",
  google: false,
}
```

## Uzasadnienie

1. **Spójność z ADR 001** — strona CMS bez Medusa nie powinna wymagać backendu e-commerce do logowania admina
2. **MedusaAuth** — jeden użytkownik admin w ekosystemie Medusa (produkty, zamówienia, ustawienia regionu)
3. **Wspólny kontrakt** — middleware panelu woła `requireAdminSession(auth)` niezależnie od implementacji

## Panel klienta (osobna ścieżka)

`CustomerOtpAuth` **nie** implementuje `AuthProvider` — to osobny flow:

- Publiczny endpoint `/store/custom/customer/login` → kod OTP e-mail
- Sesja w cookie `customer_session`
- Wymaga `CUSTOMER_JWT_SECRET` + Resend + (opcjonalnie) Redis rate limit

Nie mieszamy sesji admina i klienta (różne cookie, różne TTL, różne uprawnienia).

## Google OAuth

Flaga `auth.google: true` w config — provider OAuth konfigurowany w backendzie. Oba AuthProvidery mogą współistnieć z Google jako alternatywną metodą (implementacja per starter).

## Konsekwencje

### Pozytywne

- Starter strona deployowalny jako jeden serwis Next.js + Postgres
- Łatwe testy `PostgresAuth` bez mocków Medusa
- Migracja z lumineconcept: MedusaAuth w sklepie

### Negatywne

- Dwa flow resetu hasła (Medusa admin vs własna tabela)
- Przy migracji strona → sklep trzeba przenieść użytkowników admina

## Powiązane

- [ADR 001](001-storage-split.md)
- [security.md](../security.md)
