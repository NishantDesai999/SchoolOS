package com.schoolos.payment;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpiOcrResult(
        String transactionId,
        BigDecimal amount,
        LocalDate paymentDate,
        String senderName,
        String senderVpa,
        String recipientVpa,
        String status,
        Float confidence,
        String rawText
) {}
