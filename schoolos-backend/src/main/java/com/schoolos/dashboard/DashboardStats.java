package com.schoolos.dashboard;

import java.math.BigDecimal;

public record DashboardStats(
        long totalStudents,
        long totalTeachers,
        BigDecimal feesCollectedToday,
        long pendingDuesCount
) {}
