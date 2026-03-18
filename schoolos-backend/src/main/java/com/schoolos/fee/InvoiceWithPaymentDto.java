package com.schoolos.fee;

import java.math.BigDecimal;
import java.util.UUID;

public record InvoiceWithPaymentDto(
        UUID invoiceId,
        String invoiceNumber,
        String periodLabel,
        BigDecimal totalAmount,
        BigDecimal netAmount,
        String status,
        String receiptNumber,
        BigDecimal paymentAmount,
        String paymentMode
) {}
