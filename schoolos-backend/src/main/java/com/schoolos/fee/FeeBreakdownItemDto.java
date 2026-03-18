package com.schoolos.fee;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record FeeBreakdownItemDto(
        UUID id,
        UUID feeConfigId,
        String type,
        BigDecimal value,
        String frequency,
        Boolean isMandatory,
        Boolean isRecurring,
        Boolean gstApplicable,
        BigDecimal gstRate,
        Integer displayOrder,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime deletedAt
) {}
