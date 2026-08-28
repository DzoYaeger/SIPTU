# ASTA BOT Knowledge Governance Implementation Plan

> **For Hermes:** Implement only after Doddy approves this plan. Preserve all existing uncommitted changes in SIPTU ULTRA.

**Goal:** Turn the Telegram-facing assistant into ASTA BOT, a safe SIPTU assistant with user-isolated conversations, an admin-governed knowledge base, source-based answers, answer ratings, correction review, and auditable confirmed SIPTU actions.

**Architecture:** Keep SIPTU as the source of business data and use its existing Laravel API only; do not alter SIPTU tables directly from the assistant. Add a dedicated Hermes plugin named `asta-bot` that stores official knowledge, pending confirmations, answer ratings, correction items, and audit events in a separate SQLite database. Every record is scoped by Telegram User ID; only the configured admin ID can change official knowledge.

**Technology:** Hermes Gateway + native Hermes plugin, Telegram adapter, SQLite, Python plugin tests, existing SIPTU Laravel API (Sanctum + MFA for protected actions).

---

## Current Context Found

- SIPTU ULTRA source exists at `F:/sites/superapp/SIPTUULTRA` and is a Laravel API, React web application, and React Native mobile application.
- SIPTU Production API is `https://siptu.bpompalopo.com/core_api/api`; routes already use Sanctum authentication and provide existing BMN, Surat Tugas, Helpdesk, and other service endpoints.
- Telegram access already has an admin allowlist containing Doddy’s Telegram User ID `668496228`.
- Hermes is currently configured to group sessions per user, but built-in shared memory is disabled. Existing `MEMORY.md` must not be used for user-specific facts because it is global.
- The SIPTU repository has pre-existing modified and untracked files. This work must not overwrite, format, stage, or commit them.

## Scope Decisions

1. **Official knowledge:** only admin-confirmed entries are visible to all authorized users.
2. **User memory:** private notes and conversation-derived facts remain scoped to the originating Telegram User ID; ordinary chat never becomes global knowledge automatically.
3. **Knowledge change workflow:** `/teach`, `/update`, and `/forget` create a pending proposal first. ASTA BOT repeats the proposed change and requires explicit admin confirmation (`KONFIRMASI <id>`) before writing it.
4. **SIPTU changes:** no create, approve, return, update, or delete request is sent until ASTA BOT presents a readable summary and the requesting user replies `YA` (or uses an approved confirmation button). The action and result are written to the audit log.
5. **Answer sources:** responses cite the official knowledge record title and/or SIPTU document or API source. When no reliable source exists, ASTA BOT states that the information is unavailable and directs the user to the responsible SIPTU/Balai POM administrator.

---

## Files Planned

### New Hermes plugin
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/plugin.json`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/asta_bot.py`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/storage.py`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/knowledge.py`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/commands.py`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/siptu_client.py`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/audit.py`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/tests/test_storage.py`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/tests/test_commands.py`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/tests/test_authorization.py`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/tests/test_siptu_confirmation.py`
- Create: `C:/Users/user/AppData/Local/hermes/plugins/asta-bot/README.md`

### Hermes configuration
- Modify after review: `C:/Users/user/AppData/Local/hermes/config.yaml`
  - Enable the ASTA BOT plugin.
  - Keep `gateway.telegram.allow_admin_from: ['668496228']`.
  - Enable the plugin only on Telegram.
  - Keep raw secrets outside configuration files.

### SIPTU source
- No SIPTU source file is planned to change in phase 1.
- Read-only reference files: `F:/sites/superapp/SIPTUULTRA/backend/routes/api.php`, relevant SIPTU controllers, and `F:/sites/superapp/SIPTUULTRA/penjelasan.md`.

---

## Implementation Tasks

### Task 1: Confirm Hermes plugin contracts and isolate the workspace

**Objective:** Verify the current Hermes plugin interface before writing code and protect existing SIPTU changes.

1. Inspect the installed plugin examples and `hermes plugins doctor` expectations.
2. Confirm how Telegram slash commands, inbound message hooks, and outbound messages are registered.
3. Record the existing SIPTU git status as baseline evidence; do not modify any listed existing change.
4. Create the plugin only under the Hermes profile directory, never inside SIPTU ULTRA.

**Verification:** plugin skeleton passes `hermes plugins doctor` without being enabled.

### Task 2: Create isolated data storage and schema

**Objective:** Store data by scope and Telegram User ID with no cross-user lookup path.

Create SQLite tables:
- `knowledge_entries`: official/admin status, title, content, source_name, source_reference, created_by_telegram_id, approved_by_telegram_id, timestamps, revision number.
- `knowledge_proposals`: `teach`, `update`, or `forget` request; proposed content; proposer ID; status; confirmation timestamp.
- `user_notes`: private notes keyed by `telegram_user_id`; never returned to another user.
- `answer_feedback`: answer ID, requester ID, rating, correction text, timestamp.
- `correction_queue`: admin-review state and links to feedback/knowledge entries.
- `siptu_action_confirmations`: immutable request summary, requester ID, confirmation status, expiry, and idempotency key.
- `audit_events`: actor Telegram ID, event type, target scope, safe summary, SIPTU request ID/status, timestamp.

**Security requirements:** encrypt or omit secrets; never store SIPTU passwords, MFA codes, bearer tokens, complete phone numbers, or raw sensitive API payloads.

**Tests:** prove a query for User A cannot return User B’s notes, ratings, confirmation records, or audit details.

### Task 3: Implement admin-only knowledge commands

**Objective:** Provide confirmed, auditable knowledge management.

Commands:
- `/teach <title> | <content> | <source>` creates a pending proposal.
- `/update <knowledge-id> | <replacement-content> | <source>` creates a pending revision.
- `/forget <knowledge-id>` creates a pending archival proposal; do not hard-delete by default.
- `/review [pending|corrections]` lists pending knowledge proposals and correction items for admin only.
- `/knowledge [query]` lists approved knowledge or searches it; non-admin users see only approved, non-sensitive entries.
- `/confirm <proposal-id>` and `/cancel <proposal-id>` finalize or reject a pending proposal. These are required supporting commands for the confirmation rule.

Every proposal response repeats the intended title, content, source, scope, and effect. Only the configured admin ID may call change/approval commands. Non-admin attempts receive a short access-denied message and an audit event.

**Tests:** pending entries are not searchable; confirmation makes exactly one approved revision visible; non-admin change attempts neither modify knowledge nor disclose proposal content.

### Task 4: Implement source-grounded answer behavior

**Objective:** Make ASTA BOT answer only with reliable sources.

1. Search approved knowledge first.
2. When needed, retrieve the appropriate official SIPTU document/API source through the existing SIPTU client.
3. Append a simple source label such as `Sumber: Penjelasan SIPTU ULTRA` or `Sumber: SIPTU Production API — /bmn-loans`.
4. When nothing authoritative is found, respond: `Informasi tersebut belum tersedia di knowledge base atau dokumen resmi. Silakan hubungi pengelola [layanan terkait].`
5. Explicitly prohibit invented procedures, officials, dates, rules, and URLs.

**Tests:** answers include source labels; missing facts use the safe fallback; private notes do not influence another user’s answer.

### Task 5: Add answer rating and correction queue

**Objective:** Let users rate answers and route corrections to admin.

1. Attach an answer reference ID to eligible responses.
2. Support `/nilai <answer-id> <1-5> [catatan]` and `/koreksi <answer-id> <isi koreksi>`.
3. Store feedback under the sender’s Telegram User ID.
4. Add the correction to the admin-only `/review corrections` queue.
5. Require the same admin confirmation workflow before a correction changes official knowledge.

**Tests:** feedback is private; only admin can view the full correction queue; approved corrections produce a source-traceable knowledge revision.

### Task 6: Add confirmed and audited SIPTU action gateway

**Objective:** Ensure every state-changing SIPTU operation is explicit, authorized, and traceable.

1. Classify SIPTU actions as `read-only` or `state-changing`.
2. For a state-changing request, parse data and show a plain-language summary: service, requested action, fields, effect, and source API.
3. Require a fresh `YA <confirmation-id>` from the same Telegram User ID before dispatch.
4. Enforce short confirmation expiry, one-time use, and idempotency key.
5. Require SIPTU authentication/MFA according to the existing SIPTU service rules; use credentials only for the active request and never persist them.
6. Write safe audit metadata before and after the API request. Include actor, time, API route name, target request identifier, success/failure, and response reference—but never secrets.

**Tests:** no API mutation before confirmation; a confirmation cannot be reused; a confirmation from User B cannot execute User A’s request; audit records exist for approved, rejected, expired, and failed actions.

### Task 7: Documentation, operations, and rollout

**Objective:** Make the feature understandable and safely deployable.

1. Document user commands in plain Indonesian, including examples and confirmation messages.
2. Document admin responsibilities: approve knowledge proposals, review corrections, inspect audit events, and revoke access.
3. Add backup/restore instructions for the plugin database with access controls.
4. Run the plugin in a test Telegram chat first, with a test SIPTU account or mocked HTTP server.
5. Enable production only after admin sign-off on command behavior, source labels, privacy checks, and audit records.

---

## Security Risks and Controls

| Risk | Control |
|---|---|
| User A sees User B data | Mandatory `telegram_user_id` scope in every storage query; authorization tests for all read paths. |
| Unverified chat becomes official policy | Only admin confirmation promotes a proposal to official knowledge. |
| Incorrect answer appears authoritative | Source label required; safe fallback when a source is missing or uncertain. |
| Unauthorized SIPTU change | Same-user confirmation, short expiry, idempotency, SIPTU auth/MFA, and audit record. |
| Password, MFA, or bearer token leak | Never save credentials or raw sensitive request payloads; redact logs and audit summaries. |
| Admin account compromise | Keep Telegram admin allowlist minimal; require SIPTU MFA for SIPTU mutations; make knowledge/audit events reviewable. |
| Existing SIPTU work is overwritten | Plugin lives outside SIPTU source; baseline git status is preserved; no bulk formatting or cleanup. |
| Plugin schema differs from installed Hermes version | Validate the plugin skeleton with `hermes plugins doctor` before implementation. |

## Testing and Acceptance Criteria

1. **Unit tests:** storage isolation, proposal state machine, role authorization, source selection, audit sanitization, confirmation expiry/idempotency.
2. **Integration tests:** Telegram event fixture → command handler → SQLite; mocked SIPTU API ensures no mutation before `YA`.
3. **Security tests:** cross-user access attempts, non-admin `/teach`/`/review`, prompt-like text in knowledge content, duplicate confirmation, expired confirmation, and redaction checks.
4. **Manual acceptance in test chat:**
   - Admin teaches a rule; ASTA BOT repeats it; no knowledge change exists before confirmation; `/confirm` makes it searchable with its source.
   - Non-admin user cannot add/edit/delete/review official knowledge.
   - A standard SIPTU question cites a source; an unknown question returns the safe unavailable response.
   - A SIPTU mutation presents a readable summary, waits for confirmation, performs once, and produces an audit entry.
5. **Regression checks:** `hermes plugins doctor`, plugin test suite, `hermes gateway status`, SIPTU Laravel `php artisan test`, and SIPTU frontend `pnpm test`/`pnpm lint` only if no SIPTU source changes are introduced.

## Open Decisions Requiring Admin Approval

1. Should the initial official knowledge be imported from `penjelasan.md` in one reviewed batch, or added gradually through `/teach`?
2. Which Telegram IDs, besides Doddy (`668496228`), if any, may read approved official knowledge?
3. Should users use the word `YA`, inline buttons, or both for SIPTU action confirmation?
4. What retention period should apply to private notes, feedback, correction items, and audit events?
5. Which roles or named units should receive a referral when a source is missing (Tata Usaha, operator BMN, administrator SIPTU, or another owner)?
6. Is a separate admin dashboard required in phase 1, or is Telegram `/review` sufficient?

## Approval Gate

No implementation, plugin installation, configuration update, service restart, SIPTU API mutation, or knowledge import will occur until Doddy explicitly approves this plan.
