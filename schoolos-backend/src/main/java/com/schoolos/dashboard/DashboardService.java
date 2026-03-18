package com.schoolos.dashboard;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;

@Service
public class DashboardService {

    private final DSLContext dsl;

    public DashboardService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record MonthlyFee(int month, BigDecimal total) {}

    public DashboardStats getStats() {
        UUID schoolId = TenantContext.get();

        BigDecimal feesCollectedToday = dsl.select(DSL.coalesce(DSL.sum(PAYMENTS.AMOUNT), BigDecimal.ZERO))
                .from(PAYMENTS)
                .join(STUDENTS).on(STUDENTS.ID.eq(PAYMENTS.STUDENT_ID))
                .where(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.DELETED_AT.isNull())
                .and(PAYMENTS.PAYMENT_DATE.eq(DSL.currentLocalDate()))
                .and(PAYMENTS.STATUS.eq("SUCCESS"))
                .and(PAYMENTS.DELETED_AT.isNull())
                .fetchOneInto(BigDecimal.class);

        if (feesCollectedToday == null) feesCollectedToday = BigDecimal.ZERO;

        // Count students enrolled (onboarded) this calendar month
        java.time.OffsetDateTime monthStart = LocalDate.now().withDayOfMonth(1)
                .atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
        long newStudentsThisMonth = dsl.fetchCount(
                dsl.selectFrom(STUDENTS)
                        .where(STUDENTS.SCHOOL_ID.eq(schoolId))
                        .and(STUDENTS.DELETED_AT.isNull())
                        .and(STUDENTS.CREATED_AT.greaterOrEqual(monthStart))
        );

        return new DashboardStats(feesCollectedToday, newStudentsThisMonth);
    }

    public List<MonthlyFee> getMonthlyFees(int year) {
        UUID schoolId = TenantContext.get();

        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd = LocalDate.of(year, 12, 31);

        var rows = dsl.select(
                        DSL.month(PAYMENTS.PAYMENT_DATE).as("month"),
                        DSL.coalesce(DSL.sum(PAYMENTS.AMOUNT), BigDecimal.ZERO).as("total")
                )
                .from(PAYMENTS)
                .join(STUDENTS).on(STUDENTS.ID.eq(PAYMENTS.STUDENT_ID))
                .where(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.DELETED_AT.isNull())
                .and(PAYMENTS.PAYMENT_DATE.between(yearStart, yearEnd))
                .and(PAYMENTS.STATUS.eq("SUCCESS"))
                .and(PAYMENTS.DELETED_AT.isNull())
                .groupBy(DSL.month(PAYMENTS.PAYMENT_DATE))
                .orderBy(DSL.month(PAYMENTS.PAYMENT_DATE))
                .fetch();

        // Build full 12-month list (zero-fill missing months)
        var monthMap = new java.util.HashMap<Integer, BigDecimal>();
        for (var row : rows) {
            monthMap.put(row.get("month", Integer.class), row.get("total", BigDecimal.class));
        }

        List<MonthlyFee> result = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            result.add(new MonthlyFee(m, monthMap.getOrDefault(m, BigDecimal.ZERO)));
        }
        return result;
    }
}
