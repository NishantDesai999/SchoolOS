package com.schoolos.dashboard;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;

@Service
public class DashboardService {

    private final DSLContext dsl;

    public DashboardService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public DashboardStats getStats() {
        UUID schoolId = TenantContext.get();

        long totalStudents = dsl.fetchCount(
                dsl.selectFrom(STUDENTS)
                        .where(STUDENTS.SCHOOL_ID.eq(schoolId))
                        .and(STUDENTS.DELETED_AT.isNull())
                        .and(STUDENTS.STATUS.eq("ACTIVE"))
        );

        long totalTeachers = dsl.fetchCount(
                dsl.selectFrom(TEACHERS)
                        .where(TEACHERS.SCHOOL_ID.eq(schoolId))
                        .and(TEACHERS.DELETED_AT.isNull())
                        .and(TEACHERS.STATUS.eq("ACTIVE"))
        );

        BigDecimal feesCollectedToday = dsl.select(DSL.coalesce(DSL.sum(PAYMENTS.AMOUNT), BigDecimal.ZERO))
                .from(PAYMENTS)
                .join(FEE_INVOICES).on(PAYMENTS.INVOICE_ID.eq(FEE_INVOICES.ID))
                .join(FEE_CONFIGS).on(FEE_INVOICES.FEE_CONFIG_ID.eq(FEE_CONFIGS.ID))
                .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                .and(PAYMENTS.PAYMENT_DATE.eq(DSL.currentLocalDate()))
                .and(PAYMENTS.DELETED_AT.isNull())
                .fetchOneInto(BigDecimal.class);

        if (feesCollectedToday == null) feesCollectedToday = BigDecimal.ZERO;

        long pendingDuesCount = dsl.fetchCount(
                dsl.selectFrom(FEE_INVOICES)
                        .where(FEE_INVOICES.FEE_CONFIG_ID.in(
                                dsl.select(FEE_CONFIGS.ID).from(FEE_CONFIGS)
                                        .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                                        .and(FEE_CONFIGS.DELETED_AT.isNull())
                        ))
                        .and(FEE_INVOICES.STATUS.in("PENDING", "PARTIAL", "OVERDUE"))
                        .and(FEE_INVOICES.DELETED_AT.isNull())
        );

        return new DashboardStats(totalStudents, totalTeachers, feesCollectedToday, pendingDuesCount);
    }
}
