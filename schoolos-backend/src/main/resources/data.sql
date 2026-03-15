-- SchoolOS MVP 1 — Bootstrap Seed Data
-- All inserts are idempotent via ON CONFLICT DO NOTHING

-- ── Bootstrap School ──────────────────────────────────────────────────────────
INSERT INTO schools (id, name, code, board, address, phone, email, default_language, digest_time)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Demo School',
    'DEMO',
    'CBSE',
    '123, School Road, Ahmedabad, Gujarat - 380001',
    '07912345678',
    'admin@demoschool.edu',
    'gu',
    '20:00'
) ON CONFLICT (code) DO NOTHING;

-- ── Bootstrap Admin User ──────────────────────────────────────────────────────
-- User ID matches the Keycloak user created via realm-export.json
-- In production, the ID is synced after first login
INSERT INTO users (id, school_id, email, role, name, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'admin@school.com',
    'ADMIN',
    'School Admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- ── Bootstrap Calendar Year ───────────────────────────────────────────────────
INSERT INTO calendar_years (school_id, year, label, start_date, end_date, is_current)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    2025,
    '2025-26',
    '2025-04-01',
    '2026-03-31',
    true
) ON CONFLICT (school_id, year) DO NOTHING;
