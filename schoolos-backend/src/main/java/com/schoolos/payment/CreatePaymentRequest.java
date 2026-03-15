package com.schoolos.payment;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreatePaymentRequest(
        @NotNull UUID invoiceId,
        @NotNull BigDecimal amount,
        @NotNull String paymentMode,
        @NotNull LocalDate paymentDate,
        String upiTransactionId,
        String upiSenderName,
        String upiSenderVpa,
        String notes
) {}
