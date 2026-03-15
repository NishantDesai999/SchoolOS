package com.schoolos.digest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DigestLogDto(
        UUID id,
        UUID schoolId,
        LocalDate digestDate,
        String channel,
        String language,
        String content,
        BigDecimal feeCollectedToday,
        Integer paymentsCount,
        Integer newInquiries,
        Integer slcIssuedCount,
        BigDecimal salaryPaidToday,
        String status,
        OffsetDateTime sentAt,
        OffsetDateTime createdAt
) {}
