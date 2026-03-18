package com.schoolos.fee;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LedgerEntry(
        String type,            // INVOICE or DIRECT_PAYMENT
        String reference,       // invoice number or receipt number
        String period,          // period_label or payment_date
        BigDecimal amount,
        BigDecimal paid,
        BigDecimal balance,
        String status,
        LocalDate date
) {}
