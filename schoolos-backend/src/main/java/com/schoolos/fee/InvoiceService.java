package com.schoolos.fee;

import com.schoolos.common.TenantContext;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;
import static org.jooq.impl.DSL.field;
import static org.jooq.impl.DSL.name;

@Service
public class InvoiceService {

    private final DSLContext dsl;

    @Value("${app.upload-dir:/uploads}")
    private String uploadDir;

    public InvoiceService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record InvoicePage(List<InvoiceDto> data, long total) {}

    public InvoicePage list(String search, UUID yearId, UUID classId, String status, int page, int size) {
        UUID schoolId = TenantContext.get();

        List<Condition> conditions = new ArrayList<>();
        conditions.add(FEE_INVOICES.DELETED_AT.isNull());

        conditions.add(FEE_INVOICES.FEE_CONFIG_ID.in(
                dsl.select(FEE_CONFIGS.ID).from(FEE_CONFIGS)
                        .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                        .and(FEE_CONFIGS.DELETED_AT.isNull())
        ));

        if (status != null && !status.isBlank()) {
            conditions.add(FEE_INVOICES.STATUS.eq(status));
        }

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.toLowerCase() + "%";
            conditions.add(
                DSL.lower(FEE_INVOICES.INVOICE_NUMBER).like(pattern)
                    .or(FEE_INVOICES.STUDENT_ID.in(
                            dsl.select(STUDENTS.ID).from(STUDENTS)
                                    .where(DSL.lower(STUDENTS.FIRST_NAME).like(pattern)
                                            .or(DSL.lower(STUDENTS.LAST_NAME).like(pattern))
                                            .or(DSL.lower(STUDENTS.GR_NUMBER).like(pattern)))
                    ))
            );
        }

        Condition combined = conditions.stream().reduce(DSL.trueCondition(), Condition::and);

        long total = dsl.fetchCount(dsl.selectFrom(FEE_INVOICES).where(combined));
        List<InvoiceDto> data = dsl.selectFrom(FEE_INVOICES)
                .where(combined)
                .orderBy(FEE_INVOICES.CREATED_AT.desc())
                .limit(size).offset((long) page * size)
                .fetchInto(InvoiceDto.class);

        return new InvoicePage(data, total);
    }

    @Transactional
    public List<InvoiceDto> generateBulk(GenerateInvoicesRequest req) {
        UUID schoolId = TenantContext.get();
        java.time.LocalDate effectiveDueDate = req.dueDate() != null
                ? req.dueDate()
                : java.time.LocalDate.now().plusDays(30);

        List<UUID> feeConfigIds = dsl.select(FEE_CONFIGS.ID)
                .from(FEE_CONFIGS)
                .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                .and(FEE_CONFIGS.CALENDAR_YEAR.eq(
                        dsl.select(CALENDAR_YEARS.YEAR).from(CALENDAR_YEARS)
                                .where(CALENDAR_YEARS.ID.eq(req.calendarYearId()))
                                .limit(1)
                ))
                .and(FEE_CONFIGS.DELETED_AT.isNull())
                .fetchInto(UUID.class);

        if (feeConfigIds.isEmpty()) {
            throw new IllegalArgumentException("No fee configurations found for this calendar year. Please configure fees first.");
        }

        List<InvoiceDto> allCreated = new ArrayList<>();

        for (UUID feeConfigId : feeConfigIds) {
            Integer gradeLevel = dsl.select(FEE_CONFIGS.GRADE_LEVEL)
                    .from(FEE_CONFIGS)
                    .where(FEE_CONFIGS.ID.eq(feeConfigId))
                    .fetchOneInto(Integer.class);

            List<UUID> studentIds;
            if (req.sectionId() != null) {
                studentIds = dsl.select(STUDENT_ENROLLMENTS.STUDENT_ID)
                        .from(STUDENT_ENROLLMENTS)
                        .where(STUDENT_ENROLLMENTS.SECTION_ID.eq(req.sectionId()))
                        .and(STUDENT_ENROLLMENTS.DELETED_AT.isNull())
                        .fetchInto(UUID.class);
            } else if (req.classId() != null) {
                studentIds = dsl.select(STUDENT_ENROLLMENTS.STUDENT_ID)
                        .from(STUDENT_ENROLLMENTS)
                        .join(SECTIONS).on(SECTIONS.ID.eq(STUDENT_ENROLLMENTS.SECTION_ID))
                        .where(SECTIONS.CLASS_ID.eq(req.classId()))
                        .and(STUDENT_ENROLLMENTS.DELETED_AT.isNull())
                        .fetchInto(UUID.class);
            } else {
                studentIds = dsl.select(STUDENT_ENROLLMENTS.STUDENT_ID)
                        .from(STUDENT_ENROLLMENTS)
                        .join(SECTIONS).on(SECTIONS.ID.eq(STUDENT_ENROLLMENTS.SECTION_ID))
                        .join(CLASSES).on(CLASSES.ID.eq(SECTIONS.CLASS_ID))
                        .where(CLASSES.CALENDAR_YEAR_ID.eq(req.calendarYearId()))
                        .and(CLASSES.GRADE_LEVEL.eq(gradeLevel))
                        .and(STUDENT_ENROLLMENTS.DELETED_AT.isNull())
                        .fetchInto(UUID.class);
            }

            if (studentIds.isEmpty()) continue;

            List<FeeBreakdownItemDto> items = dsl.selectFrom(FEE_BREAKDOWN_ITEMS)
                    .where(FEE_BREAKDOWN_ITEMS.FEE_CONFIG_ID.eq(feeConfigId))
                    .and(FEE_BREAKDOWN_ITEMS.DELETED_AT.isNull())
                    .fetchInto(FeeBreakdownItemDto.class);

            if (items.isEmpty()) continue;

            BigDecimal totalAmount = items.stream()
                    .map(FeeBreakdownItemDto::value)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            for (UUID studentId : studentIds) {
                int existing = dsl.fetchCount(
                        dsl.selectFrom(FEE_INVOICES)
                                .where(FEE_INVOICES.STUDENT_ID.eq(studentId))
                                .and(FEE_INVOICES.FEE_CONFIG_ID.eq(feeConfigId))
                                .and(FEE_INVOICES.PERIOD_LABEL.eq(req.periodLabel()))
                                .and(FEE_INVOICES.DELETED_AT.isNull())
                );
                if (existing > 0) continue;

                UUID invoiceId = UUID.randomUUID();
                String invoiceNumber = generateInvoiceNumber(schoolId);

                dsl.insertInto(FEE_INVOICES)
                        .set(FEE_INVOICES.ID, invoiceId)
                        .set(FEE_INVOICES.INVOICE_NUMBER, invoiceNumber)
                        .set(FEE_INVOICES.STUDENT_ID, studentId)
                        .set(FEE_INVOICES.FEE_CONFIG_ID, feeConfigId)
                        .set(FEE_INVOICES.PERIOD_LABEL, req.periodLabel())
                        .set(FEE_INVOICES.DUE_DATE, effectiveDueDate)
                        .set(FEE_INVOICES.TOTAL_AMOUNT, totalAmount)
                        .set(FEE_INVOICES.DISCOUNT_AMOUNT, BigDecimal.ZERO)
                        .set(FEE_INVOICES.LATE_FEE, BigDecimal.ZERO)
                        .set(FEE_INVOICES.NET_AMOUNT, totalAmount)
                        .set(FEE_INVOICES.STATUS, "PENDING")
                        .execute();

                for (var item : items) {
                    dsl.insertInto(FEE_INVOICE_ITEMS)
                            .set(FEE_INVOICE_ITEMS.ID, UUID.randomUUID())
                            .set(FEE_INVOICE_ITEMS.INVOICE_ID, invoiceId)
                            .set(FEE_INVOICE_ITEMS.FEE_BREAKDOWN_ITEM_ID, item.id())
                            .set(FEE_INVOICE_ITEMS.TYPE_LABEL, item.type())
                            .set(FEE_INVOICE_ITEMS.AMOUNT, item.value())
                            .set(FEE_INVOICE_ITEMS.DISCOUNT, BigDecimal.ZERO)
                            .set(FEE_INVOICE_ITEMS.GST_AMOUNT, BigDecimal.ZERO)
                            .set(FEE_INVOICE_ITEMS.NET_AMOUNT, item.value())
                            .execute();
                }

                allCreated.add(getById(invoiceId));
            }
        }

        return allCreated;
    }

    public InvoiceDto getById(UUID id) {
        InvoiceDto invoice = dsl.selectFrom(FEE_INVOICES)
                .where(FEE_INVOICES.ID.eq(id))
                .and(FEE_INVOICES.DELETED_AT.isNull())
                .fetchOneInto(InvoiceDto.class);
        if (invoice == null) throw new NoSuchElementException("Invoice not found");
        return invoice;
    }

    /** Legacy ledger (invoices only). Kept for backward compat. */
    public List<InvoiceDto> getStudentLedger(UUID studentId, UUID yearId) {
        return dsl.selectFrom(FEE_INVOICES)
                .where(FEE_INVOICES.STUDENT_ID.eq(studentId))
                .and(FEE_INVOICES.DELETED_AT.isNull())
                .orderBy(FEE_INVOICES.DUE_DATE.asc())
                .fetchInto(InvoiceDto.class);
    }

    /**
     * Unified student ledger: returns both invoice entries AND direct payments
     * (where invoice_id IS NULL), ordered by date descending.
     */
    public List<LedgerEntry> getUnifiedLedger(UUID studentId) {
        UUID schoolId = TenantContext.get();
        List<LedgerEntry> entries = new ArrayList<>();

        // Invoice entries — explicit select so new from_month/to_month columns are included
        var fromMonthField = field(name("from_month"), String.class).as("from_month");
        var toMonthField   = field(name("to_month"),   String.class).as("to_month");

        var invoices = dsl.select(
                        FEE_INVOICES.ID, FEE_INVOICES.INVOICE_NUMBER,
                        FEE_INVOICES.PERIOD_LABEL, FEE_INVOICES.DUE_DATE,
                        FEE_INVOICES.TOTAL_AMOUNT, FEE_INVOICES.NET_AMOUNT,
                        FEE_INVOICES.STATUS, fromMonthField, toMonthField)
                .from(FEE_INVOICES)
                .where(FEE_INVOICES.STUDENT_ID.eq(studentId))
                .and(FEE_INVOICES.DELETED_AT.isNull())
                .fetch();

        for (var inv : invoices) {
            // Sum payments for this invoice
            BigDecimal paid = dsl.select(DSL.sum(PAYMENTS.AMOUNT))
                    .from(PAYMENTS)
                    .where(PAYMENTS.INVOICE_ID.eq(inv.get(FEE_INVOICES.ID)))
                    .and(PAYMENTS.DELETED_AT.isNull())
                    .and(PAYMENTS.STATUS.eq("SUCCESS"))
                    .fetchOneInto(BigDecimal.class);
            if (paid == null) paid = BigDecimal.ZERO;

            BigDecimal net = inv.get(FEE_INVOICES.NET_AMOUNT);
            BigDecimal balance = net.subtract(paid);
            if (balance.compareTo(BigDecimal.ZERO) < 0) balance = BigDecimal.ZERO;

            // Build period label from from_month/to_month if available, else period_label
            String fromMonthRaw = inv.get("from_month", String.class);
            String toMonthRaw   = inv.get("to_month",   String.class);
            String period;
            if (fromMonthRaw != null && toMonthRaw != null) {
                period = formatMonthRange(fromMonthRaw, toMonthRaw);
            } else {
                period = inv.get(FEE_INVOICES.PERIOD_LABEL);
            }

            entries.add(new LedgerEntry(
                    "INVOICE",
                    inv.get(FEE_INVOICES.INVOICE_NUMBER),
                    period,
                    inv.get(FEE_INVOICES.TOTAL_AMOUNT),
                    paid,
                    balance,
                    inv.get(FEE_INVOICES.STATUS),
                    inv.get(FEE_INVOICES.DUE_DATE)
            ));
        }

        // Direct payments (no invoice)
        var directPayments = dsl.selectFrom(PAYMENTS)
                .where(PAYMENTS.STUDENT_ID.eq(studentId))
                .and(PAYMENTS.INVOICE_ID.isNull())
                .and(PAYMENTS.DELETED_AT.isNull())
                .and(PAYMENTS.STATUS.eq("SUCCESS"))
                .fetch();

        for (var p : directPayments) {
            entries.add(new LedgerEntry(
                    "DIRECT_PAYMENT",
                    p.get(PAYMENTS.RECEIPT_NUMBER),
                    p.get(PAYMENTS.PAYMENT_DATE).toString(),
                    p.get(PAYMENTS.AMOUNT),
                    p.get(PAYMENTS.AMOUNT),
                    BigDecimal.ZERO,
                    "PAID",
                    p.get(PAYMENTS.PAYMENT_DATE)
            ));
        }

        entries.sort(Comparator.comparing(LedgerEntry::date).reversed());
        return entries;
    }

    /**
     * Collect fee for a student: creates invoice + payment in one transaction.
     */
    @Transactional
    public InvoiceWithPaymentDto collectForStudent(CollectFeeRequest req) {
        UUID schoolId = TenantContext.get();

        // Validate student belongs to school
        boolean studentExists = dsl.fetchExists(
                dsl.selectFrom(STUDENTS)
                        .where(STUDENTS.ID.eq(req.studentId()))
                        .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                        .and(STUDENTS.DELETED_AT.isNull())
        );
        if (!studentExists) throw new NoSuchElementException("Student not found");

        // Find fee config for this student's grade + school year derived from fromMonth
        YearMonth from = YearMonth.parse(req.fromMonth());
        int schoolYear = from.getMonthValue() >= 6 ? from.getYear() : from.getYear() - 1;

        var enrollmentRow = dsl.select(CLASSES.GRADE_LEVEL)
                .from(STUDENT_ENROLLMENTS)
                .join(SECTIONS).on(SECTIONS.ID.eq(STUDENT_ENROLLMENTS.SECTION_ID))
                .join(CLASSES).on(CLASSES.ID.eq(SECTIONS.CLASS_ID))
                .where(STUDENT_ENROLLMENTS.STUDENT_ID.eq(req.studentId()))
                .and(STUDENT_ENROLLMENTS.DELETED_AT.isNull())
                .orderBy(STUDENT_ENROLLMENTS.CREATED_AT.desc())
                .limit(1)
                .fetchOne();

        if (enrollmentRow == null) throw new IllegalArgumentException("Student has no enrollment");
        int gradeLevel = enrollmentRow.value1();

        UUID feeConfigId = dsl.select(FEE_CONFIGS.ID)
                .from(FEE_CONFIGS)
                .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                .and(FEE_CONFIGS.CALENDAR_YEAR.eq(schoolYear))
                .and(FEE_CONFIGS.GRADE_LEVEL.eq(gradeLevel))
                .and(FEE_CONFIGS.DELETED_AT.isNull())
                .fetchOneInto(UUID.class);

        if (feeConfigId == null)
            throw new NoSuchElementException("No fee config found for grade " + gradeLevel + " year " + schoolYear);

        // Build period label
        String periodLabel = formatMonthRange(req.fromMonth(), req.toMonth());

        // Compute total from provided items
        BigDecimal totalAmount = req.items() == null ? req.amount() :
                req.items().stream()
                        .map(CollectFeeRequest.CollectLineItem::amount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Create invoice
        UUID invoiceId = UUID.randomUUID();
        String invoiceNumber = generateInvoiceNumber(schoolId);
        LocalDate today = LocalDate.now();

        dsl.insertInto(FEE_INVOICES)
                .set(FEE_INVOICES.ID, invoiceId)
                .set(FEE_INVOICES.INVOICE_NUMBER, invoiceNumber)
                .set(FEE_INVOICES.STUDENT_ID, req.studentId())
                .set(FEE_INVOICES.FEE_CONFIG_ID, feeConfigId)
                .set(FEE_INVOICES.PERIOD_LABEL, periodLabel)
                .set(FEE_INVOICES.DUE_DATE, today)
                .set(FEE_INVOICES.TOTAL_AMOUNT, totalAmount)
                .set(FEE_INVOICES.DISCOUNT_AMOUNT, BigDecimal.ZERO)
                .set(FEE_INVOICES.LATE_FEE, BigDecimal.ZERO)
                .set(FEE_INVOICES.NET_AMOUNT, totalAmount)
                .set(FEE_INVOICES.STATUS, "PENDING")
                .set(field(name("from_month"), String.class), req.fromMonth())
                .set(field(name("to_month"),   String.class), req.toMonth())
                .execute();

        // Create invoice line items
        if (req.items() != null) {
            for (var item : req.items()) {
                dsl.insertInto(FEE_INVOICE_ITEMS)
                        .set(FEE_INVOICE_ITEMS.ID, UUID.randomUUID())
                        .set(FEE_INVOICE_ITEMS.INVOICE_ID, invoiceId)
                        .set(FEE_INVOICE_ITEMS.FEE_BREAKDOWN_ITEM_ID, item.breakdownItemId())
                        .set(FEE_INVOICE_ITEMS.TYPE_LABEL, item.typeLabel())
                        .set(FEE_INVOICE_ITEMS.AMOUNT, item.amount())
                        .set(FEE_INVOICE_ITEMS.DISCOUNT, BigDecimal.ZERO)
                        .set(FEE_INVOICE_ITEMS.GST_AMOUNT, BigDecimal.ZERO)
                        .set(FEE_INVOICE_ITEMS.NET_AMOUNT, item.amount())
                        .execute();
            }
        }

        // Create payment record
        String receiptNumber = generateReceiptNumber(schoolId);
        BigDecimal paymentAmount = req.amount() != null ? req.amount() : totalAmount;

        dsl.insertInto(PAYMENTS)
                .set(PAYMENTS.ID, UUID.randomUUID())
                .set(PAYMENTS.RECEIPT_NUMBER, receiptNumber)
                .set(PAYMENTS.INVOICE_ID, invoiceId)
                .set(PAYMENTS.STUDENT_ID, req.studentId())
                .set(PAYMENTS.AMOUNT, paymentAmount)
                .set(PAYMENTS.PAYMENT_MODE, req.paymentMode() != null ? req.paymentMode() : "CASH")
                .set(PAYMENTS.PAYMENT_DATE, today)
                .set(PAYMENTS.UPI_TRANSACTION_ID, req.upiTransactionId())
                .set(PAYMENTS.UPI_SENDER_NAME, req.upiSenderName())
                .set(PAYMENTS.STATUS, "SUCCESS")
                .set(PAYMENTS.NOTES, req.notes())
                .execute();

        // Update invoice status
        String invoiceStatus = paymentAmount.compareTo(totalAmount) >= 0 ? "PAID" : "PARTIAL";
        dsl.update(FEE_INVOICES)
                .set(FEE_INVOICES.STATUS, invoiceStatus)
                .set(FEE_INVOICES.UPDATED_AT, OffsetDateTime.now())
                .where(FEE_INVOICES.ID.eq(invoiceId))
                .execute();

        return new InvoiceWithPaymentDto(
                invoiceId, invoiceNumber, periodLabel,
                totalAmount, totalAmount,
                invoiceStatus,
                receiptNumber, paymentAmount,
                req.paymentMode() != null ? req.paymentMode() : "CASH"
        );
    }

    public List<InvoiceDto> getDefaulters(UUID yearId) {
        UUID schoolId = TenantContext.get();

        List<Condition> conditions = new ArrayList<>();
        conditions.add(FEE_INVOICES.STATUS.in("PENDING", "PARTIAL", "OVERDUE"));
        conditions.add(FEE_INVOICES.DELETED_AT.isNull());
        conditions.add(FEE_INVOICES.FEE_CONFIG_ID.in(
                dsl.select(FEE_CONFIGS.ID).from(FEE_CONFIGS)
                        .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                        .and(FEE_CONFIGS.DELETED_AT.isNull())
        ));

        return dsl.selectFrom(FEE_INVOICES)
                .where(conditions.stream().reduce(DSL.trueCondition(), Condition::and))
                .orderBy(FEE_INVOICES.DUE_DATE.asc())
                .fetchInto(InvoiceDto.class);
    }

    public String generatePdf(UUID id, String lang) {
        return "/uploads/invoices/invoice-" + id + "-" + lang + ".pdf";
    }

    private String generateInvoiceNumber(UUID schoolId) {
        int year = java.time.LocalDate.now().getYear();
        Integer count = dsl.fetchCount(
                dsl.selectFrom(FEE_INVOICES)
                        .where(FEE_INVOICES.FEE_CONFIG_ID.in(
                                dsl.select(FEE_CONFIGS.ID).from(FEE_CONFIGS)
                                        .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                        ))
        );
        return "INV-" + year + "-" + String.format("%05d", count + 1);
    }

    private String generateReceiptNumber(UUID schoolId) {
        int year = java.time.LocalDate.now().getYear();
        Integer count = dsl.fetchCount(
                dsl.selectFrom(PAYMENTS)
                        .where(PAYMENTS.STUDENT_ID.in(
                                dsl.select(STUDENTS.ID).from(STUDENTS)
                                        .where(STUDENTS.SCHOOL_ID.eq(schoolId))
                        ))
        );
        return "RCT-" + year + "-" + String.format("%05d", count + 1);
    }

    /** Format "2025-06" to "2025-11" as "Jun – Nov 2025" */
    private String formatMonthRange(String fromMonth, String toMonth) {
        try {
            YearMonth from = YearMonth.parse(fromMonth);
            YearMonth to   = YearMonth.parse(toMonth);
            String fromLabel = from.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            String toLabel   = to.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            int year = from.getYear();
            if (from.getYear() == to.getYear()) {
                return fromLabel + "–" + toLabel + " " + year;
            } else {
                return fromLabel + " " + year + "–" + toLabel + " " + to.getYear();
            }
        } catch (Exception e) {
            return fromMonth + " to " + toMonth;
        }
    }
}
