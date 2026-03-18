package com.schoolos.dashboard;

import java.math.BigDecimal;

public record DashboardStats(
        BigDecimal feesCollectedToday,
        long newStudentsThisMonth
) {}
