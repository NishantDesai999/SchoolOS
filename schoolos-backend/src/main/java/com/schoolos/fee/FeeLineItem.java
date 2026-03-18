package com.schoolos.fee;

import java.math.BigDecimal;
import java.util.UUID;

public record FeeLineItem(
        UUID breakdownItemId,
        String type,
        String label,
        BigDecimal unitAmount,
        int multiplier,
        BigDecimal lineTotal,
        boolean alreadyPaid,
        String alreadyPaidNote
) {}
