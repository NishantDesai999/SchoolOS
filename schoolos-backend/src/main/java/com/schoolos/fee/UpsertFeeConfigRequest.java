package com.schoolos.fee;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record UpsertFeeConfigRequest(
        @NotNull Integer calendarYear,
        @NotNull Integer gradeLevel,
        Boolean isActive,
        List<FeeBreakdownItemInput> items
) {
    public record FeeBreakdownItemInput(
            String type,
            BigDecimal value,
            String frequency,
            Boolean isMandatory,
            Boolean isRecurring,
            Boolean gstApplicable,
            BigDecimal gstRate,
            Integer displayOrder
    ) {}
}
