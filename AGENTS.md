# AGENTS.md — LabSynch Frontend Standards

This file defines the strict standards, conventions, and rules all frontend agents must follow when contributing to the LabSynch interface. Read this file in full before writing or modifying any UI code.
ALSO REFER TO THE WIREFRAMES IMAGES PRESENT IN THE DIRECTORY wireframes/ for exact layout and design specifications of some key pages.
---

Refer to the system architecture [here](./docs/system-architecture.md) and API documentation in the backend codebase for detailed information on available endpoints, expected request/response formats, and authentication flows. This document focuses on the frontend-specific rules and guidelines to ensure a consistent and maintainable codebase.

There have been additional features added to the labsych architecture that are not present in the system architecture document. Refer to the `schema.json` file for the exact API endpoint structure and response formats. and also the `docs/updated-frontend.md` file for additional information on the frontend architecture.

## 1. Project Context
LabSynch is a multi-tenant laboratory equipment rental platform.
- **Backend**: Django REST Framework API.
- **Authentication**: JWT (JSON Web Tokens).
- **Roles**: `ADMIN` (Lab owner/managers) and `SCHOOL` (Client schools borrowing equipment).

---

## 2. API Interaction Rules
All endpoints are strictly defined in the backend routing. Do NOT invent endpoints.

### 2.1 The Standard Envelope
**Every** backend response (success or failure) is wrapped in a strict JSON envelope. 
Your network client (`axios`/`fetch`) MUST unwrap this correctly.

**Success (2xx):**
```json
{
  "success": true,
  "message": "Human readable success string",
  "data": { ... } // Could be an object, or paginated list { count, next, results: [] }
}
```

**Error (4xx/5xx):**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "field_name": ["Array of error strings"],
    "non_field_errors": ["Array of business logic error strings"]
  }
}
```

### 2.2 JWT Authentication
- The login endpoint (`/api/auth/login/`) returns `access` (60m lifespan) and `refresh` (7d lifespan) tokens inside `data.tokens`.
- Store the `access` token securely (e.g. Memory / HttpOnly Cookie / Secure LocalStorage) and attach it as `Authorization: Bearer <token>` to all protected endpoints.
- If an API call fails with `401 Unauthorized`, you MUST attempt to refresh the token using `/api/auth/token/refresh/` before redirecting the user to login.

---

## 3. UI/UX Rules & Wireframes
- The user will provide images or descriptions of wireframes. **You must follow the layout exactly as depicted.**
- **Design System:** Unless specified otherwise, establish a clean, consistent, and responsive design system.
- **Forms & Validation:** 
  - Perform client-side validation BEFORE submitting to the API.
  - Map backend errors from the `errors` object directly to the respective form inputs. Display `non_field_errors` as banner alerts at the top of the form.

---

## 4. Specific Role Boundaries
You must structurally separate the `ADMIN` UI from the `SCHOOL` UI.
- `ADMIN`: Has access to `/admin/*` routes. Allowed to view/create Equipment, approve Damages, issue/return Bookings, and dictate Maintenance.
- `SCHOOL`: Has access to `/school/*` or public routes. Restricted to managing their own cart, creating their own bookings, and paying via M-Pesa.

---

## 5. Development Workflow
1. **Never mock data indefinitely:** Connect components directly to their respective API endpoint using environment variables for the API Base URL.
2. **Component architecture:** Split reusable UI elements (Buttons, Modals, Inputs) out from Page-level layout components.
3. **TypeScript:** Strongly typing API responses natively matching the Django schemas is heavily encouraged.

*Note: Reference the `schema.json` file for the exact API endpoint structure and response formats.*