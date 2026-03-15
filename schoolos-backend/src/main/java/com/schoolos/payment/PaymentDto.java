package com.schoolos.payment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentDto(
        UUID id,
        String receiptNumber,
        UUID invoiceId,
        UUID studentId,
        BigDecimal amount,
        String paymentMode,
        LocalDate paymentDate,
        String upiTransactionId,
        String upiSenderName,
        String upiSenderVpa,
        String screenshotUrl,
        String ocrStatus,
        BigDecimal ocrConfidence,
        UUID collectedBy,
        String receiptUrl,
        String status,
        String notes,
        OffsetDateTime createdAt
) {}
