package com.schoolos.payment;

import com.schoolos.common.StorageService;
import com.schoolos.common.TenantContext;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;

@Service
public class PaymentService {

    private final DSLContext dsl;
    private final StorageService storageService;
    private final ReceiptPdfService receiptPdfService;
    private final UpiOcrService upiOcrService;

    public PaymentService(DSLContext dsl, StorageService storageService,
                          ReceiptPdfService receiptPdfService, UpiOcrService upiOcrService) {
        this.dsl = dsl;
        this.storageService = storageService;
        this.receiptPdfService = receiptPdfService;
        this.upiOcrService = upiOcrService;
    }

    public record PaymentPage(List<PaymentDto> data, long total) {}

    public PaymentPage list(String search, String dateFrom, String dateTo, int page, int size) {
        UUID schoolId = TenantContext.get();

        List<Condition> conditions = new ArrayList<>();
        conditions.add(PAYMENTS.DELETED_AT.isNull());
        // Filter by school via students
        conditions.add(PAYMENTS.STUDENT_ID.in(
                dsl.select(STUDENTS.ID).from(STUDENTS)
                        .where(STUDENTS.SCHOOL_ID.eq(schoolId))
                        .and(STUDENTS.DELETED_AT.isNull())
        ));

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.toLowerCase() + "%";
            conditions.add(
                DSL.lower(PAYMENTS.RECEIPT_NUMBER).like(pattern)
                    .or(DSL.lower(PAYMENTS.UPI_TRANSACTION_ID).like(pattern))
                    .or(PAYMENTS.STUDENT_ID.in(
                        dsl.select(STUDENTS.ID).from(STUDENTS)
                            .where(STUDENTS.DELETED_AT.isNull())
                            .and(DSL.lower(DSL.concat(STUDENTS.FIRST_NAME, DSL.val(" "), STUDENTS.LAST_NAME)).like(pattern)
                                .or(DSL.lower(STUDENTS.GR_NUMBER).like(pattern)))
                    ))
            );
        }

        if (dateFrom != null && !dateFrom.isBlank()) {
            conditions.add(PAYMENTS.PAYMENT_DATE.greaterOrEqual(LocalDate.parse(dateFrom)));
        }
        if (dateTo != null && !dateTo.isBlank()) {
            conditions.add(PAYMENTS.PAYMENT_DATE.lessOrEqual(LocalDate.parse(dateTo)));
        }

        Condition combined = conditions.stream().reduce(DSL.trueCondition(), Condition::and);

        long total = dsl.fetchCount(dsl.selectFrom(PAYMENTS).where(combined));
        List<PaymentDto> data = dsl.select(
                        PAYMENTS.ID, PAYMENTS.RECEIPT_NUMBER, PAYMENTS.INVOICE_ID, PAYMENTS.STUDENT_ID,
                        PAYMENTS.AMOUNT, PAYMENTS.PAYMENT_MODE, PAYMENTS.PAYMENT_DATE,
                        PAYMENTS.UPI_TRANSACTION_ID, PAYMENTS.UPI_SENDER_NAME, PAYMENTS.UPI_SENDER_VPA,
                        PAYMENTS.SCREENSHOT_URL, PAYMENTS.OCR_STATUS, PAYMENTS.OCR_CONFIDENCE,
                        PAYMENTS.COLLECTED_BY, PAYMENTS.RECEIPT_URL, PAYMENTS.STATUS, PAYMENTS.NOTES,
                        PAYMENTS.CREATED_AT, PAYMENTS.UPDATED_AT, PAYMENTS.DELETED_AT,
                        DSL.concat(STUDENTS.FIRST_NAME, DSL.val(" "), STUDENTS.LAST_NAME).as("student_name"),
                        STUDENTS.GR_NUMBER
                )
                .from(PAYMENTS)
                .leftJoin(STUDENTS).on(STUDENTS.ID.eq(PAYMENTS.STUDENT_ID))
                .where(combined)
                .orderBy(PAYMENTS.CREATED_AT.desc())
                .limit(size).offset((long) page * size)
                .fetchInto(PaymentDto.class);

        return new PaymentPage(data, total);
    }

    @Transactional
    public PaymentDto create(CreatePaymentRequest req) {
        UUID schoolId = TenantContext.get();
        UUID paymentId = UUID.randomUUID();
        String receiptNumber = generateReceiptNumber(schoolId);

        // Get invoice details
        var invoice = dsl.selectFrom(FEE_INVOICES)
                .where(FEE_INVOICES.ID.eq(req.invoiceId()))
                .and(FEE_INVOICES.DELETED_AT.isNull())
                .fetchOne();
        if (invoice == null) throw new NoSuchElementException("Invoice not found");

        dsl.insertInto(PAYMENTS)
                .set(PAYMENTS.ID, paymentId)
                .set(PAYMENTS.RECEIPT_NUMBER, receiptNumber)
                .set(PAYMENTS.INVOICE_ID, req.invoiceId())
                .set(PAYMENTS.STUDENT_ID, invoice.get(FEE_INVOICES.STUDENT_ID))
                .set(PAYMENTS.AMOUNT, req.amount())
                .set(PAYMENTS.PAYMENT_MODE, req.paymentMode())
                .set(PAYMENTS.PAYMENT_DATE, req.paymentDate())
                .set(PAYMENTS.UPI_TRANSACTION_ID, req.upiTransactionId())
                .set(PAYMENTS.UPI_SENDER_NAME, req.upiSenderName())
                .set(PAYMENTS.UPI_SENDER_VPA, req.upiSenderVpa())
                .set(PAYMENTS.NOTES, req.notes())
                .set(PAYMENTS.STATUS, "SUCCESS")
                .set(PAYMENTS.OCR_RAW_DATA, org.jooq.JSONB.valueOf("{}"))
                .execute();

        // Update invoice status
        BigDecimal netAmount = invoice.get(FEE_INVOICES.NET_AMOUNT);
        BigDecimal existingPaid = dsl.select(DSL.coalesce(DSL.sum(PAYMENTS.AMOUNT), BigDecimal.ZERO))
                .from(PAYMENTS)
                .where(PAYMENTS.INVOICE_ID.eq(req.invoiceId()))
                .and(PAYMENTS.DELETED_AT.isNull())
                .and(PAYMENTS.STATUS.eq("SUCCESS"))
                .fetchOneInto(BigDecimal.class);

        if (existingPaid == null) existingPaid = BigDecimal.ZERO;

        String newStatus;
        if (existingPaid.compareTo(netAmount) >= 0) {
            newStatus = "PAID";
        } else if (existingPaid.compareTo(BigDecimal.ZERO) > 0) {
            newStatus = "PARTIAL";
        } else {
            newStatus = "PENDING";
        }

        dsl.update(FEE_INVOICES)
                .set(FEE_INVOICES.STATUS, newStatus)
                .set(FEE_INVOICES.UPDATED_AT, java.time.OffsetDateTime.now())
                .where(FEE_INVOICES.ID.eq(req.invoiceId()))
                .execute();

        return getById(paymentId);
    }

    @Transactional
    public PaymentDto directCollect(DirectPaymentRequest req) {
        UUID schoolId = TenantContext.get();
        UUID paymentId = UUID.randomUUID();
        String receiptNumber = generateReceiptNumber(schoolId);

        dsl.insertInto(PAYMENTS)
                .set(PAYMENTS.ID, paymentId)
                .set(PAYMENTS.RECEIPT_NUMBER, receiptNumber)
                .set(PAYMENTS.STUDENT_ID, req.studentId())
                .set(PAYMENTS.AMOUNT, req.amount())
                .set(PAYMENTS.PAYMENT_MODE, req.paymentMode())
                .set(PAYMENTS.PAYMENT_DATE, req.paymentDate())
                .set(PAYMENTS.UPI_TRANSACTION_ID, req.upiTransactionId())
                .set(PAYMENTS.NOTES, req.notes())
                .set(PAYMENTS.STATUS, "SUCCESS")
                .set(PAYMENTS.OCR_RAW_DATA, org.jooq.JSONB.valueOf("{}"))
                .execute();

        return getById(paymentId);
    }

    public PaymentDto getById(UUID id) {
        PaymentDto payment = dsl.selectFrom(PAYMENTS)
                .where(PAYMENTS.ID.eq(id))
                .and(PAYMENTS.DELETED_AT.isNull())
                .fetchOneInto(PaymentDto.class);
        if (payment == null) throw new NoSuchElementException("Payment not found");
        return payment;
    }

    public String getReceipt(UUID id, String lang) {
        PaymentDto payment = getById(id);
        return receiptPdfService.generate(payment, lang);
    }

    public UpiOcrResult processUpiScreenshot(MultipartFile file) {
        try {
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
            return upiOcrService.extractFromScreenshot(file.getBytes(), mimeType);
        } catch (Exception e) {
            return new UpiOcrResult(null, null, null, null, null, null, "FAILED", 0f, "Error: " + e.getMessage());
        }
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
        return "RCP-" + year + "-" + String.format("%05d", count + 1);
    }
}
