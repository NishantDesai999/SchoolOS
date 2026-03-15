package com.schoolos.teacher;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateSalaryPaymentRequest(
        @NotNull BigDecimal amount,
        @NotNull LocalDate paymentDate,
        @NotBlank String paymentMode,
        @NotBlank String monthLabel,
        String referenceNumber,
        String notes
) {}
