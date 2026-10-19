# ServiceFlow

ServiceFlow is a business OS for service companies (AC repair, appliance work, and similar field services). Owners manage customers, jobs, staff, and invoices. Staff use a mobile-friendly portal for assigned tasks.

## Stack

- **Frontend:** React + Vite + Tailwind CSS v4
- **Backend:** Express + MongoDB (Mongoose)
- **Messaging:** Green-API WhatsApp reminders & completion notices
- **Payments:** Razorpay payment links

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API defaults to `http://localhost:5000`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App defaults to `http://localhost:5173`.

## Roles

| Role | Entry | Capabilities |
|------|-------|--------------|
| Owner | `/register` → `/onboarding` → `/` | Customers, service requests, team, invoices, settings |
| Staff | `/staff/login` | View assigned jobs, start/complete work, schedule, profile |

Staff accounts are created by the owner under **Team**. Share the generated Staff ID and password.

## Core workflow

1. Owner registers and creates a business workspace.
2. Owner adds customers and creates service requests.
3. Owner assigns requests to staff.
4. Staff starts a job, then completes it with a final amount.
5. Backend creates an invoice, generates a Razorpay payment link, and sends a WhatsApp completion notice with the payment link.
6. Customer pays via the Razorpay link (invoice auto-updates via webhook) or owner marks it paid manually under **Invoices & payments**.

## Production checklist

- Set a strong `JWT_SECRET` and real Green-API credentials
- Set `CORS_ORIGINS` to your deployed frontend origin(s)
- Configure Razorpay API keys and webhook (see [RAZORPAY_SETUP.md](./RAZORPAY_SETUP.md))
- Use HTTPS reverse proxy for API and frontend
- Keep `.env` out of version control
