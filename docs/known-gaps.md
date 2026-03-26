# Known Gaps / Future Work

1. **No backend auth middleware** — API endpoints are unprotected. Backend relies on `x-user-id` header trust. No JWT/session.
2. **Discussion/Topic feature** — `Discussion` Prisma model exists but no backend routes/services or frontend UI are implemented.
3. **Seed (种子) feature** — Prisma models exist (`Seed`, `SeedCollaborator`, `SeedUpdate`, `SeedUpdateMedia`) but no backend routes or frontend UI.
4. **Postcard purchase** — `PostcardPurchase` model exists but Stripe payment integration is not built.
5. **Google OAuth bind/unbind in settings** — Google login + auto-binding works, but explicit bind/unbind UI in settings page is stubbed ("即将开放").
6. **Quiet hours** — Email quiet hours setting noted as "即将上线" in settings page.
7. **Co-Host auto-pairing** — `ExperimentPairing` model exists but no routes/UI. P3-D email rule describes auto-pairing but not implemented.
8. **Mock data cleanup** — `src/mock/data.ts` and `src/mock/api.ts` are dead code (not imported anywhere). Can be safely removed.
