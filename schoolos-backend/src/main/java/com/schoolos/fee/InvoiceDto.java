package com.schoolos.fee;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record InvoiceDto(
        UUID id,
        String invoiceNumber,
        UUID studentId,
        UUID feeConfigId,
        String periodLabel,
        LocalDate dueDate,
        BigDecimal totalAmount,
        BigDecimal discountAmount,
        BigDecimal lateFee,
        BigDecimal netAmount,
        String status,
        List<InvoiceItemDto> items,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public record InvoiceItemDto(
            UUID id,
            String typeLabel,
            BigDecimal amount,
            BigDecimal discount,
            BigDecimal gstAmount,
            BigDecimal netAmount
    ) {}
}
