QA Checklist — BUMDes Mulyoarjo App

Purpose: manual and automated checks to validate key flows and requirements before release.

1) Auth & Onboarding
- [ ] Phone-based signup: user can sign up with phone + password; OTP/confirm flows behave per Supabase config.
- [ ] "Other" unit creation: when selecting "Other" at signup, a new `units` row is created and `profiles.unit_id` links to it.
- [ ] Roles assignment: first user becomes `super_admin`; requested roles (staff/unit_admin/operator/viewer) map correctly and `status` defaults to `pending` unless auto-approved.
- [ ] Login: login works using phone + password for all roles.
- [ ] Profile status: unapproved users cannot access protected data; approved users can.

2) RBAC & RLS
- [ ] Super admin: can view/export across all units.
- [ ] Unit admin/staff: can only access their unit's data (read/write per role).
- [ ] Operator: read-only access across units (verify SELECT-only policies).
- [ ] Viewer: read-only access to their unit.
- [ ] Attempted cross-unit writes are rejected by RLS.

3) Import / Export (Excel)
- [ ] Export: per-role export rules enforced (super_admin exports all units; unit_admin/staff only own unit; viewer no export).
- [ ] Template generation: `Template_BMSA_MSA.xlsx` downloads and follows latest template spec.
- [ ] Roundtrip: export → manual edit (rename header, reorder columns, change date formats) → re-import succeeds using tolerant parser.
- [ ] Duplicate detection: import warns about duplicates and prompts user.
- [ ] Batch validation modal: errors/warnings displayed, user must confirm before commit.
- [ ] Import history: each import creates an `import_history` row with metadata and user id.

4) Data Integrity
- [ ] After import/replace, totals per kas/gudang match expected sums.
- [ ] Timestamps, created_by fields set correctly to importing user.
- [x] Edge cases: missing columns, extra columns, blank rows handled gracefully. (covered by `tests/unit/excel.test.js`, 2026-07-11)

5) Operator Dashboard
- [ ] Operator can access `OperatorDashboard` and view unit summaries.
- [ ] PDF export/print works from the dashboard.

6) UI / UX
- [ ] Branding: header/footer show MSA branding and contact person (Bu Shefi +62 896-5658-9449).
- [ ] Error and success messages are clear and localized.
- [ ] Import progress indicator and success notice appear.

7) Security & Access
- [ ] No sensitive keys in client bundles beyond publishable key.
- [ ] REST calls include `Authorization` header for authenticated routes.
- [ ] Verify RLS by attempting direct PostgREST calls with lower-privilege tokens.

Acceptance criteria: all critical paths above pass manually; automated tests cover login/signup, export-import roundtrip, and RBAC enforcement.

Test data notes:
- Use three units: `unit_a`, `unit_b`, `unit_c` with sample entries to test cross-unit access.
- Test users: `super_admin`, `unit_admin_a`, `staff_a`, `operator`, `viewer_b`.

How to record issues:
- Open an issue with reproduction steps, expected vs actual, and attach exported Excel when relevant.


