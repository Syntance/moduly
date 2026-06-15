# Bezpieczeństwo

Wytyczne bezpieczeństwa dla projektów Moduly — auth, OTP, rate limiting, backup i disaster recovery.

## Uwierzytelnianie administratora

### PostgresAuth (starter strona)

- Hasła hashowane **Argon2id** (`@moduly/auth-core`)
- Sesje JWT podpisane `JWT_SECRET` (ENV, min. 32 znaki losowe)
- Token hashowany SHA-256 przed zapisem w tabeli `admin_sessions`
- Cookie `httpOnly`, `secure` w produkcji, `sameSite: lax`

### MedusaAuth (starter sklep)

- Delegacja do Medusa Admin API (`/auth/user/emailpass`)
- Token w cookie skonfigurowanym w `moduly.config.ts` → `auth.cookieName`
- Timeout fetch: 10s (`AbortSignal.timeout`)

### Allowlist

```env
ADMIN_ALLOWLIST_EMAILS=admin@firma.pl,owner@firma.pl
```

Tylko adresy z listy mogą zalogować się do panelu — nawet przy poprawnym haśle.

## Panel klienta (OTP)

Moduł `@moduly/client-panel` + `CustomerOtpAuth`:

| Parametr | Domyślnie | ENV |
|----------|-----------|-----|
| TTL kodu OTP | 10 min | — |
| Max prób | 5 | — |
| TTL sesji | 7 dni | `CUSTOMER_SESSION_TTL_SEC` |
| Cookie | `customer_session` | `CUSTOMER_SESSION_COOKIE` |
| JWT secret | — | `CUSTOMER_JWT_SECRET` (wymagany) |

Kod OTP:

- 6 cyfr, `crypto.randomInt`
- Hash SHA-256 przed zapisem (nigdy plaintext w Redis/DB)
- Wysyłka przez Resend (`RESEND_API_KEY`)

**Nigdy** nie loguj kodu OTP ani pełnego tokena sesji.

## Rate limiting

`@moduly/auth-core` dostarcza `checkRateLimit` i `checkLoginRateLimit`:

- Logowanie admina: **5 prób / 15 min** per IP i per e-mail
- Endpointy `/store/custom/*`: limit przez Upstash Redis

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Bez Redis — **fail-open** (żądanie przechodzi). W produkcji Redis jest wymagany.

## Sekrety i ENV

| Sekret | Gdzie | Rotacja |
|--------|-------|---------|
| `JWT_SECRET` | Backend + PostgresAuth | Co 90 dni lub po incydencie |
| `COOKIE_SECRET` | Medusa | Przy deploy nowego środowiska |
| `CUSTOMER_JWT_SECRET` | OTP panel klienta | Niezależny od admin JWT |
| `MEDUSA_REVALIDATE_SECRET` | Webhook revalidacji CMS | Per środowisko |
| Klucze P24/Stripe/tpay | Medusa modules | Zgodnie z panelem providera |

Zasady:

- Sekrety **tylko** w ENV / secret managerze (Vercel, Railway)
- `.env.example` — bez prawdziwych wartości
- Sentry `beforeSend` — scrub email, phone, address, IP (reguła 00-ecom-core)

## Transport i nagłówki

- HTTPS everywhere w produkcji
- CSP: `script-src` nonce + `'strict-dynamic'`; `style-src` `'unsafe-inline'` (animacje)
- CORS Medusa: `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` — whitelist domen

## Audyt

`DataStore` + `recordAudit` loguje:

- `content.update`, `settings.update`
- `form.submission`, `return.create`, `return.status_update`

Pola: `actorEmail`, `resourceType`, `resourceId`, `createdAt`. Bez PII w metadata.

## Backup i Disaster Recovery

### Postgres (Medusa + CMS)

| Element | RPO | RTO | Metoda |
|---------|-----|-----|--------|
| Baza produkcyjna | ≤ 1h | ≤ 4h | Point-in-time recovery (Neon/Supabase/RDS) |
| Uploady CMS (R2) | ≤ 24h | ≤ 8h | Wersjonowanie bucketu Cloudflare R2 |
| Redis (sesje OTP) | N/A | ≤ 1h | Ephemeral — użytkownik ponawia OTP |

### Procedura przy awarii bazy

1. Przełącz DNS / connection string na replikę / restore point
2. Uruchom `pnpm --filter @moduly/backend db:migrate` jeśli schema drift
3. Smoke test: login admin, checkout testowy, zapis CMS
4. Post-mortem w ciągu 48h

### Pliki lokalne (dev)

`S3_*` puste → fallback file-local. **Nie używaj** w produkcji.

## Checklist przed produkcją

- [ ] `JWT_SECRET`, `CUSTOMER_JWT_SECRET`, `COOKIE_SECRET` — losowe, unikalne
- [ ] `ADMIN_ALLOWLIST_EMAILS` ustawiony
- [ ] Upstash Redis skonfigurowany
- [ ] Sentry DSN + PII scrubbing
- [ ] Backup Postgres włączony (PITR)
- [ ] R2/S3 dla uploadów CMS
- [ ] `MODULY_DISABLE_PUBLIC_ENSURE_PAYMENT=true` jeśli endpoint nieużywany
- [ ] Rate limit na `/store/custom/customer/login` i `verify-otp`

## Zobacz też

- [ADR 003 — AuthProvider](adr/003-auth-provider.md)
- [payments.md](payments.md)
- Reguły Cursor: `56-legal.mdc`, `55-security` (cursor-rules)
