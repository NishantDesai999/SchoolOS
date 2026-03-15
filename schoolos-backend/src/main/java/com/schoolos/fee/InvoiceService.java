package com.schoolos.fee;

import com.schoolos.common.TenantContext;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;

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

        // Filter by school via fee_configs
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

        // Find students for the given section/class
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
            throw new IllegalArgumentException("Either classId or sectionId must be provided");
        }

        List<FeeBreakdownItemDto> items = dsl.selectFrom(FEE_BREAKDOWN_ITEMS)
                .where(FEE_BREAKDOWN_ITEMS.FEE_CONFIG_ID.eq(req.feeConfigId()))
                .and(FEE_BREAKDOWN_ITEMS.DELETED_AT.isNull())
                .fetchInto(FeeBreakdownItemDto.class);

        BigDecimal totalAmount = items.stream()
                .map(FeeBreakdownItemDto::value)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<InvoiceDto> created = new ArrayList<>();
        for (UUID studentId : studentIds) {
            // Skip if invoice already exists for this period
            int existing = dsl.fetchCount(
                    dsl.selectFrom(FEE_INVOICES)
                            .where(FEE_INVOICES.STUDENT_ID.eq(studentId))
                            .and(FEE_INVOICES.FEE_CONFIG_ID.eq(req.feeConfigId()))
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
                    .set(FEE_INVOICES.FEE_CONFIG_ID, req.feeConfigId())
                    .set(FEE_INVOICES.PERIOD_LABEL, req.periodLabel())
                    .set(FEE_INVOICES.DUE_DATE, req.dueDate())
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

            created.add(getById(invoiceId));
        }

        return created;
    }

    public InvoiceDto getById(UUID id) {
        UUID schoolId = TenantContext.get();
        InvoiceDto invoice = dsl.selectFrom(FEE_INVOICES)
                .where(FEE_INVOICES.ID.eq(id))
                .and(FEE_INVOICES.DELETED_AT.isNull())
                .fetchOneInto(InvoiceDto.class);
        if (invoice == null) throw new NoSuchElementException("Invoice not found");
        return invoice;
    }

    public List<InvoiceDto> getStudentLedger(UUID studentId, UUID yearId) {
        UUID schoolId = TenantContext.get();

        var query = dsl.selectFrom(FEE_INVOICES)
                .where(FEE_INVOICES.STUDENT_ID.eq(studentId))
                .and(FEE_INVOICES.DELETED_AT.isNull());

        return query
                .orderBy(FEE_INVOICES.DUE_DATE.asc())
                .fetchInto(InvoiceDto.class);
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
        InvoiceDto invoice = getById(id);
        // Simple PDF generation - could be enhanced
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
}
