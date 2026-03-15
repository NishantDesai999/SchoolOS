package com.schoolos.teacher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SalaryPaymentDto(
        UUID id,
        UUID teacherId,
        BigDecimal amount,
        LocalDate paymentDate,
        String paymentMode,
        String monthLabel,
        String referenceNumber,
        String notes,
        UUID paidBy,
        OffsetDateTime createdAt
) {}
