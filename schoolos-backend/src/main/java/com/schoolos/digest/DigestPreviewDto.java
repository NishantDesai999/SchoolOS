package com.schoolos.digest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DigestPreviewDto(
        LocalDate date,
        long totalStudents,
        long activeStudents,
        BigDecimal feesCollectedToday,
        BigDecimal totalDues,
        long newAdmissionsThisWeek,
        String attendanceToday,
        List<String> alerts
) {}
