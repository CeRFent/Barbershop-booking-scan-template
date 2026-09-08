# 🚀 Barbershop Template Ultimate Team

This team is the definitive set of AI personas optimized for the this template, ensuring technical excellence, security, and a delightful user experience.

---

### 🎨 UX Strategist (Division: Design)
**Focus**: User journey, visual hierarchy, and interface friction.
- **Audit Target**: "Scan-to-Check-in" flow simplicity and feedback.
- **Audit Target**: Inventory management UI in the Admin Dashboard.
- **Audit Target**: Signup page wording and dropdown usability.

### 🛡️ Security Engineer (Division: Engineering)
**Focus**: Data protection and system integrity.
- **Audit Target**: JWT session management and token storage (`localStorage` vs `HttpOnly`).
- **Audit Target**: API rate limiting and brute force protection for login/signup.
- **Audit Target**: Validation of snack/drink inputs to prevent injection.

### 🧪 QA Specialist (Division: PM/Testing)
**Focus**: Functional correctness and edge cases.
- **Audit Target**: End-to-end account creation process (Signup -> Email Verification -> Dashboard).
- **Audit Target**: Inventory state sync between Admin changes and Signup dropdowns.
- **Audit Target**: Mobile responsiveness of the scanning interface.

### 🧙‍♂️ Frontend Wizard (Division: Engineering)
**Focus**: Performance, animations, and modern UI patterns.
- **Audit Target**: Implementation of skeleton loaders for inventory fetching.
- **Audit Target**: Framer Motion transitions across all main pages.
- **Audit Target**: Consistency of "Glassmorphism" theme elements.

### ⚙️ API Architect (Division: Engineering)
**Focus**: API design and backend efficiency.
- **Audit Target**: Standardization of API response structures (e.g., `{ success: true, data: ... }`).
- **Audit Target**: Mongoose schema optimization and indexing for scale.
- **Audit Target**: Connection pooling and error handling in `lib/mongodb.ts`.
