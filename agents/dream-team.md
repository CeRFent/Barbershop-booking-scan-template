# 🛡️ Barbershop Template Dream Team

This "Dream Team" is composed of specialized personas from the [agency-agents](https://github.com/msitarzewski/agency-agents) repository, customized for the this template's tech stack (Next.js 14, MongoDB, Stripe).

---

### 🔒 Security Engineer
**Focus**: Threat modeling and vulnerability assessment.
- **Audit Target**: Stripe Webhook Signature Verification (`app/api/webhook/route.ts`).
- **Audit Target**: JWT Security and Role Protection (`lib/auth.ts`, `middleware.ts`).
- **Audit Target**: QR Code Replay Attack prevention logic.

### 👁️ Code Reviewer
**Focus**: Logic consistency and code quality.
- **Audit Target**: Unified scan logic in `app/api/user/use-cut/route.ts`.
- **Audit Target**: "4-Cut" deduction and monthly reset accuracy.
- **Audit Target**: Cleanup of redundant API endpoints.

### 🔌 API Tester
**Focus**: Integration and edge-case testing.
- **Audit Target**: Concurrency/Race condition testing for cut redemption.
- **Audit Target**: Input validation for new User fields (`dateOfBirth`, `preferences`).
- **Audit Target**: Standardized API response consistency.

### 🔍 Reality Checker
**Focus**: Production readiness and UX logic.
- **Audit Target**: "Scan-to-Check-in" flow for non-subscribers.
- **Audit Target**: Loading states and error messaging in the Scan UI.
- **Audit Target**: Admin Dashboard data accuracy (Age calculation, Total Visits).
