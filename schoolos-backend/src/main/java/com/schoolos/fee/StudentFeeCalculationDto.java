package com.schoolos.fee;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record StudentFeeCalculationDto(
        UUID studentId,
        String studentName,
        String grNumber,
        String className,
        int gradeLevel,
        String schoolYear,
        String fromMonth,
        String toMonth,
        int numMonths,
        List<FeeLineItem> items,
        BigDecimal subtotal,
        BigDecimal dueAmount
) {}
