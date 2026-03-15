package com.schoolos.fee;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record FeeCalculationResult(
        UUID studentId,
        String grNumber,
        Integer gradeLevel,
        Integer calendarYear,
        BigDecimal totalAnnual,
        BigDecimal totalAfterDiscount,
        List<FeeBreakdownItemDto> breakdown,
        List<DiscountApplied> discountsApplied
) {
    public record DiscountApplied(
            String name,
            String type,
            BigDecimal value,
            BigDecimal amount
    ) {}
}
