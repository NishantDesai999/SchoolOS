package com.schoolos.fee;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CollectFeeRequest(
        UUID studentId,
        String fromMonth,
        String toMonth,
        List<CollectLineItem> items,
        BigDecimal amount,
        String paymentMode,
        String upiTransactionId,
        String upiSenderName,
        String notes
) {
    public record CollectLineItem(
            UUID breakdownItemId,
            String typeLabel,
            BigDecimal amount
    ) {}
}
