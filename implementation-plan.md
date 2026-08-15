## Implementation Plan

Assumptions carried in from `project-scope.md`'s still-open questions (flagged inline below where they affect a phase):
- AI replies are **human-reviewed before sending** by default (safer default given the FERPA question is unresolved) — revisit if that's decided otherwise.
- Knowledge base is **read-only content used by the AI**, not admin-authored in v1 — Phase 6 is scoped minimally and flagged.
- Ticket lifecycle keeps it simple: no SLA timers, closed tickets do not auto-reopen (a new reply creates a new ticket) — revisit if that's wrong.

---

## Phase 0: Project Setup

- [ ] Init frontend (Vite + React + TypeScript) and backend (Express + TypeScript) projects
- [ ] Set up Prisma with PostgreSQL, initial connection config
- [ ] Docker Compose for local dev (Postgres, Redis)
- [ ] Env/config management (.env files, secrets handling)
- [ ] Lint/format tooling (ESLint, Prettier) for both projects
- [ ] Basic CI pipeline (lint, typecheck, test on push)

## Phase 1: Auth & User Management

- [ ] Prisma schema: `User` (id, email, password hash, role: admin/agent, active)
- [ ] Prisma schema: `Session` (id, userId, expiresAt)
- [ ] Bootstrap script: create the initial admin account on first deploy
- [ ] Backend: login endpoint (verify password, create DB session, set httpOnly cookie)
- [ ] Backend: logout endpoint (invalidate session)
- [ ] Backend: session middleware (validate cookie, attach user to request)
- [ ] Backend: role-guard middleware (admin-only routes)
- [ ] Backend: admin endpoints to create/list/deactivate agent accounts
- [ ] Frontend: login page
- [ ] Frontend: auth context/hook, protected route wrapper (React Router)
- [ ] Frontend: admin "Manage Agents" page (list, create, deactivate)

## Phase 2: Ticket Data Model & Manual Management

- [ ] Prisma schema: `Ticket` (id, subject, status enum, category enum, studentEmail, assignedAgentId, createdAt, updatedAt)
- [ ] Prisma schema: `Message` (id, ticketId, sender type, body, createdAt) — the thread
- [ ] Backend: create ticket endpoint (manual, for testing before email ingestion exists)
- [ ] Backend: list tickets endpoint (filter by status/category, sort)
- [ ] Backend: get ticket detail endpoint (with message thread)
- [ ] Backend: update ticket (status, category, assignee) endpoint
- [ ] Frontend: ticket list page (table, filters, sorting)
- [ ] Frontend: ticket detail page (thread view, status/category controls)
- [ ] Frontend: dashboard page (ticket counts by status/category)

## Phase 3: Email Ingestion & Outbound Replies

- [ ] Configure SendGrid/Mailgun inbound parse webhook
- [ ] Backend: inbound webhook endpoint (verify request signature)
- [ ] Parse inbound email → create `Ticket` + first `Message`
- [ ] Threading: match reply to existing open ticket (e.g. via reference token in subject) vs. create new ticket
- [ ] Backend: outbound send endpoint (agent reply → actual email via SendGrid/Mailgun)
- [ ] Decide & implement attachment handling (store + link, or explicitly drop for v1)

## Phase 4: AI Classification & Summarization

- [ ] Integrate Claude API client in backend
- [ ] Set up BullMQ + Redis job queue
- [ ] Job: classify ticket into category (general question / technical question / refund request) via structured output
- [ ] Job: generate ticket summary
- [ ] Store AI output (category, summary, confidence, model version) on the ticket
- [ ] Trigger classification + summarization automatically on ticket creation
- [ ] Frontend: show AI summary and category on ticket detail

## Phase 5: AI-Suggested Replies

- [ ] Define minimal knowledge base source (e.g. a static set of KB entries seeded into the DB or a doc referenced in the prompt)
- [ ] Job: generate a suggested reply draft using ticket content + knowledge base
- [ ] Store suggested reply on the ticket (separate from sent messages)
- [ ] Frontend: show suggested reply in ticket detail, editable before sending
- [ ] Backend: "approve & send" endpoint (agent-edited reply → outbound email, marks as sent)

## Phase 6: Knowledge Base (minimal, flagged as open scope)

- [ ] Confirm with stakeholder whether KB authoring is in v1 scope or out
- [ ] If in scope: Prisma schema `KnowledgeBaseArticle` (title, content)
- [ ] If in scope: admin CRUD UI for KB articles

## Phase 7: Hardening & QA

- [ ] Role-based access checks audited across all endpoints
- [ ] Input validation on all endpoints
- [ ] Audit log for AI actions and ticket status changes
- [ ] Rate limiting / retry + error handling for Claude API and email webhook calls
- [ ] Unit tests for backend business logic (classification handling, routing, session logic)
- [ ] Integration tests for key API flows
- [ ] End-to-end test for critical path: inbound email → classify → agent reviews/sends reply

## Phase 8: Deployment

- [ ] Dockerize frontend and backend
- [ ] Provision managed Postgres and Redis
- [ ] Set up staging and production environments on chosen cloud provider
- [ ] Configure domain, TLS, secrets
- [ ] Run bootstrap admin creation in production
- [ ] End-to-end smoke test in staging before go-live
