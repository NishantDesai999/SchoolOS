-- SchoolOS MVP 1 — Full Database Schema
-- All tables use CREATE TABLE IF NOT EXISTS for idempotent startup
-- UUID PKs, soft-delete via deleted_at, school_id for multi-tenancy

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Core: Schools ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(200) NOT NULL,
    code                    VARCHAR(20)  UNIQUE NOT NULL,
    board                   VARCHAR(50)  NOT NULL,
    address                 TEXT,
    phone                   VARCHAR(15),
    email                   VARCHAR(100),
    logo_url                VARCHAR(500),
    principal_signature_url VARCHAR(500),
    default_language        VARCHAR(5)   NOT NULL DEFAULT 'en',
    owner_whatsapp          VARCHAR(15),
    owner_email             VARCHAR(100),
    digest_time             TIME         DEFAULT '20:00',
    settings                JSONB        NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ
);

-- ── Core: Users (synced from Keycloak) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                  UUID         PRIMARY KEY,   -- matches Keycloak subject ID
    school_id           UUID         NOT NULL REFERENCES schools(id),
    email               VARCHAR(100) UNIQUE,
    phone               VARCHAR(15),
    role                VARCHAR(30)  NOT NULL,      -- ADMIN / ACCOUNTANT / PARENT
    name                VARCHAR(150) NOT NULL,
    preferred_language  VARCHAR(5),                 -- en / hi / gu (NULL = school default)
    is_active           BOOLEAN      NOT NULL DEFAULT true,
    keycloak_synced_at  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- ── Core: Calendar Years ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_years (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID         NOT NULL REFERENCES schools(id),
    year        INTEGER      NOT NULL,
    label       VARCHAR(20)  NOT NULL,   -- e.g. 2025-26
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    is_current  BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    UNIQUE (school_id, year)
);

-- ── Classes & Sections ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id        UUID        NOT NULL REFERENCES schools(id),
    calendar_year_id UUID        NOT NULL REFERENCES calendar_years(id),
    name             VARCHAR(30) NOT NULL,           -- e.g. Class 5
    grade_level      INTEGER     NOT NULL,           -- 0=KG, 1-12
    display_order    INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ,
    UNIQUE (school_id, calendar_year_id, grade_level)
);

CREATE TABLE IF NOT EXISTS sections (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id         UUID        NOT NULL REFERENCES classes(id),
    name             VARCHAR(10) NOT NULL,   -- e.g. A, B, C
    capacity         INTEGER     NOT NULL DEFAULT 40,
    class_teacher_id UUID,                   -- FK to teachers added below
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ,
    UNIQUE (class_id, name)
);

-- ── Students ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id      UUID         NOT NULL REFERENCES schools(id),
    gr_number      VARCHAR(30)  UNIQUE NOT NULL,
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL,
    date_of_birth  DATE         NOT NULL,
    gender         VARCHAR(10)  NOT NULL,    -- M / F / Other
    blood_group    VARCHAR(5),
    aadhaar_number VARCHAR(12),              -- encrypted AES-256
    photo_url      VARCHAR(500),
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE / ALUMNI / TC_ISSUED
    admission_date DATE         NOT NULL,
    category       VARCHAR(30),             -- GEN / OBC / SC / ST / EWS
    is_rte         BOOLEAN      NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS student_enrollments (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID        NOT NULL REFERENCES students(id),
    section_id       UUID        NOT NULL REFERENCES sections(id),
    calendar_year_id UUID        NOT NULL REFERENCES calendar_years(id),
    roll_number      INTEGER,
    enrollment_date  DATE        NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'ENROLLED',  -- ENROLLED / PROMOTED / DETAINED
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ,
    UNIQUE (student_id, calendar_year_id)
);

CREATE TABLE IF NOT EXISTS guardians (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID          REFERENCES users(id),  -- nullable portal login
    name               VARCHAR(150)  NOT NULL,
    relation           VARCHAR(20)   NOT NULL,  -- FATHER / MOTHER / GUARDIAN
    phone              VARCHAR(15)   NOT NULL,
    email              VARCHAR(100),
    occupation         VARCHAR(100),
    annual_income      DECIMAL(12,2),
    preferred_language VARCHAR(5),
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS student_guardians (
    student_id  UUID    NOT NULL REFERENCES students(id),
    guardian_id UUID    NOT NULL REFERENCES guardians(id),
    is_primary  BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS admission_applications (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id          UUID         NOT NULL REFERENCES schools(id),
    calendar_year_id   UUID         NOT NULL REFERENCES calendar_years(id),
    target_grade_level INTEGER      NOT NULL,
    student_name       VARCHAR(200) NOT NULL,
    dob                DATE         NOT NULL,
    guardian_name      VARCHAR(150) NOT NULL,
    guardian_phone     VARCHAR(15)  NOT NULL,
    guardian_email     VARCHAR(100),
    preferred_language VARCHAR(5)   DEFAULT 'gu',
    status             VARCHAR(30)  NOT NULL DEFAULT 'INQUIRY',
    -- INQUIRY / SUBMITTED / UNDER_REVIEW / APPROVED / REJECTED / ENROLLED
    source             VARCHAR(50),
    documents          JSONB        NOT NULL DEFAULT '[]',
    notes              TEXT,
    follow_up_date     DATE,
    applied_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);

-- ── Teachers ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id        UUID          NOT NULL REFERENCES schools(id),
    user_id          UUID          REFERENCES users(id),  -- nullable login
    employee_id      VARCHAR(30)   UNIQUE NOT NULL,
    first_name       VARCHAR(100)  NOT NULL,
    last_name        VARCHAR(100)  NOT NULL,
    phone            VARCHAR(15)   NOT NULL,
    email            VARCHAR(100),
    date_of_birth    DATE,
    gender           VARCHAR(10)   NOT NULL,
    qualification    VARCHAR(200),
    specialization   VARCHAR(100),
    date_of_joining  DATE          NOT NULL,
    designation      VARCHAR(50),   -- PGT / TGT / PRT
    photo_url        VARCHAR(500),
    status           VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE / RESIGNED / TERMINATED
    bank_account     VARCHAR(20),   -- encrypted
    bank_ifsc        VARCHAR(15),
    monthly_salary   DECIMAL(10,2),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ
);

-- Add FK now that teachers table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'sections_class_teacher_id_fkey'
    ) THEN
        ALTER TABLE sections
            ADD CONSTRAINT sections_class_teacher_id_fkey
            FOREIGN KEY (class_teacher_id) REFERENCES teachers(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS teacher_salary_payments (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id       UUID          NOT NULL REFERENCES teachers(id),
    amount           DECIMAL(10,2) NOT NULL,
    payment_date     DATE          NOT NULL,
    payment_mode     VARCHAR(20)   NOT NULL,  -- CASH / UPI / NEFT / CHEQUE
    month_label      VARCHAR(20)   NOT NULL,  -- e.g. March 2026
    reference_number VARCHAR(100),
    notes            TEXT,
    paid_by          UUID          REFERENCES users(id),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ
);

-- ── SLC ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_leaving_certificates (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id               UUID         NOT NULL REFERENCES schools(id),
    student_id              UUID         UNIQUE NOT NULL REFERENCES students(id),
    gr_number               VARCHAR(30)  NOT NULL,  -- denormalized
    date_of_leaving         DATE         NOT NULL,
    reason                  VARCHAR(30)  NOT NULL,  -- TC / MIGRATION / DROPOUT / TRANSFER / OTHER
    reason_detail           TEXT,
    last_grade_attended     INTEGER      NOT NULL,
    last_exam_passed        VARCHAR(50),
    character_conduct       VARCHAR(200) NOT NULL,
    general_remarks         TEXT,
    student_signature_url   VARCHAR(500) NOT NULL,
    guardian_signature_url  VARCHAR(500) NOT NULL,
    principal_signature_url VARCHAR(500),
    slc_number              VARCHAR(30)  UNIQUE NOT NULL,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'ISSUED',
    -- ISSUED / CANCELLED / DUPLICATE_ISSUED
    issued_by               UUID         REFERENCES users(id),
    issued_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    pdf_url_en              VARCHAR(500),
    pdf_url_hi              VARCHAR(500),
    pdf_url_gu              VARCHAR(500),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ
);

-- ── Fee Structure / Calculator ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_configs (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id     UUID    NOT NULL REFERENCES schools(id),
    calendar_year INTEGER NOT NULL,
    grade_level   INTEGER NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ,
    UNIQUE (school_id, calendar_year, grade_level)
);

CREATE TABLE IF NOT EXISTS fee_breakdown_items (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_config_id UUID          NOT NULL REFERENCES fee_configs(id),
    type          VARCHAR(100)  NOT NULL,  -- English canonical e.g. Tuition Fee
    value         DECIMAL(10,2) NOT NULL,
    frequency     VARCHAR(20)   NOT NULL DEFAULT 'ANNUAL',
    -- MONTHLY / QUARTERLY / ANNUAL / ONE_TIME
    is_mandatory  BOOLEAN       NOT NULL DEFAULT true,
    is_recurring  BOOLEAN       NOT NULL DEFAULT true,
    gst_applicable BOOLEAN      NOT NULL DEFAULT false,
    gst_rate      DECIMAL(5,2)  NOT NULL DEFAULT 0,
    display_order INTEGER       NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fee_discounts (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id            UUID          NOT NULL REFERENCES schools(id),
    name                 VARCHAR(100)  NOT NULL,
    type                 VARCHAR(20)   NOT NULL,  -- PERCENTAGE / FLAT
    value                DECIMAL(10,2) NOT NULL,
    applicable_fee_types JSONB         NOT NULL DEFAULT '[]',
    criteria             JSONB         NOT NULL DEFAULT '{}',
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS late_fee_rules (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id         UUID          NOT NULL REFERENCES schools(id),
    grace_period_days INTEGER       NOT NULL DEFAULT 7,
    type              VARCHAR(20)   NOT NULL,  -- FLAT / PERCENTAGE / PER_DAY
    value             DECIMAL(10,2) NOT NULL,
    max_late_fee      DECIMAL(10,2),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

-- ── Fee Invoices ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_invoices (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number  VARCHAR(30)   UNIQUE NOT NULL,
    student_id      UUID          NOT NULL REFERENCES students(id),
    fee_config_id   UUID          NOT NULL REFERENCES fee_configs(id),
    period_label    VARCHAR(30)   NOT NULL,  -- e.g. April 2025, Q1 2025
    due_date        DATE          NOT NULL,
    total_amount    DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    late_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_amount      DECIMAL(10,2) NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    -- PENDING / PARTIAL / PAID / OVERDUE / WAIVED
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fee_invoice_items (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id           UUID          NOT NULL REFERENCES fee_invoices(id),
    fee_breakdown_item_id UUID         NOT NULL REFERENCES fee_breakdown_items(id),
    type_label           VARCHAR(100)  NOT NULL,  -- snapshot of fee type name
    amount               DECIMAL(10,2) NOT NULL,
    discount             DECIMAL(10,2) NOT NULL DEFAULT 0,
    gst_amount           DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_amount           DECIMAL(10,2) NOT NULL,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);

-- ── Payments ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number     VARCHAR(30)   UNIQUE NOT NULL,
    invoice_id         UUID          NOT NULL REFERENCES fee_invoices(id),
    student_id         UUID          NOT NULL REFERENCES students(id),
    amount             DECIMAL(10,2) NOT NULL,
    payment_mode       VARCHAR(20)   NOT NULL,  -- CASH / UPI
    payment_date       DATE          NOT NULL,
    upi_transaction_id VARCHAR(100),
    upi_sender_name    VARCHAR(150),
    upi_sender_vpa     VARCHAR(100),
    screenshot_url     VARCHAR(500),
    ocr_raw_data       JSONB         NOT NULL DEFAULT '{}',
    ocr_confidence     DECIMAL(5,2),
    ocr_status         VARCHAR(20),  -- EXTRACTED / FAILED / MANUAL
    collected_by       UUID          REFERENCES users(id),
    receipt_url        VARCHAR(500),
    status             VARCHAR(20)   NOT NULL DEFAULT 'SUCCESS',
    -- SUCCESS / FAILED / REFUNDED
    notes              TEXT,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);

-- ── Govt Circular OCR ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS govt_circulars (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id          UUID          NOT NULL REFERENCES schools(id),
    calendar_year      INTEGER       NOT NULL,
    circular_number    VARCHAR(100),
    file_url           VARCHAR(500)  NOT NULL,
    ocr_status         VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    -- PENDING / EXTRACTED / FAILED
    ocr_extracted_data JSONB         NOT NULL DEFAULT '{}',
    ocr_confidence     DECIMAL(5,2),
    uploaded_by        UUID          REFERENCES users(id),
    uploaded_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);

-- ── Daily Digest Logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_digest_logs (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID          NOT NULL REFERENCES schools(id),
    digest_date         DATE          NOT NULL,
    channel             VARCHAR(20)   NOT NULL,  -- WHATSAPP / EMAIL
    language            VARCHAR(5)    NOT NULL,
    content             TEXT          NOT NULL,
    fee_collected_today DECIMAL(12,2),
    payments_count      INTEGER,
    new_inquiries       INTEGER,
    slc_issued_count    INTEGER,
    salary_paid_today   DECIMAL(12,2),
    status              VARCHAR(20)   NOT NULL DEFAULT 'SENT',  -- SENT / FAILED
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_gr
    ON students (school_id, gr_number) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enroll_student_year
    ON student_enrollments (student_id, calendar_year_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enroll_section
    ON student_enrollments (section_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_classes_year
    ON classes (school_id, calendar_year_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_feeconfig_year_grade
    ON fee_configs (school_id, calendar_year, grade_level) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inv_student
    ON fee_invoices (student_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inv_status_due
    ON fee_invoices (status, due_date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pay_invoice
    ON payments (invoice_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pay_student
    ON payments (student_id, payment_date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pay_upi_txn
    ON payments (upi_transaction_id) WHERE upi_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_slc_gr
    ON school_leaving_certificates (gr_number) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_salary_teacher
    ON teacher_salary_payments (teacher_id, payment_date) WHERE deleted_at IS NULL;
