package com.schoolos.payment;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record DirectPaymentRequest(
        @NotNull UUID studentId,
        @NotNull BigDecimal amount,
        @NotNull String paymentMode,
        @NotNull LocalDate paymentDate,
        String periodLabel,
        String upiTransactionId,
        String notes
) {}
