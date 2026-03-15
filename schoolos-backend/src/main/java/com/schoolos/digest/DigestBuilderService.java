package com.schoolos.digest;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;

@Service
public class DigestBuilderService {

    private final DSLContext dsl;

    public DigestBuilderService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public DigestPreviewDto buildForSchool(UUID schoolId) {
        long totalStudents = dsl.fetchCount(
                dsl.selectFrom(STUDENTS)
                        .where(STUDENTS.SCHOOL_ID.eq(schoolId))
                        .and(STUDENTS.DELETED_AT.isNull())
        );

        long activeStudents = dsl.fetchCount(
                dsl.selectFrom(STUDENTS)
                        .where(STUDENTS.SCHOOL_ID.eq(schoolId))
                        .and(STUDENTS.DELETED_AT.isNull())
                        .and(STUDENTS.STATUS.eq("ACTIVE"))
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

        BigDecimal totalDues = dsl.select(DSL.coalesce(DSL.sum(FEE_INVOICES.NET_AMOUNT), BigDecimal.ZERO))
                .from(FEE_INVOICES)
                .join(FEE_CONFIGS).on(FEE_INVOICES.FEE_CONFIG_ID.eq(FEE_CONFIGS.ID))
                .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                .and(FEE_INVOICES.STATUS.in("PENDING", "PARTIAL", "OVERDUE"))
                .and(FEE_INVOICES.DELETED_AT.isNull())
                .fetchOneInto(BigDecimal.class);
        if (totalDues == null) totalDues = BigDecimal.ZERO;

        LocalDate weekAgo = LocalDate.now().minus(7, ChronoUnit.DAYS);
        long newAdmissionsThisWeek = dsl.fetchCount(
                dsl.selectFrom(ADMISSION_APPLICATIONS)
                        .where(ADMISSION_APPLICATIONS.SCHOOL_ID.eq(schoolId))
                        .and(ADMISSION_APPLICATIONS.APPLIED_AT.ge(weekAgo.atStartOfDay().atOffset(java.time.ZoneOffset.UTC)))
                        .and(ADMISSION_APPLICATIONS.DELETED_AT.isNull())
        );

        List<String> alerts = new ArrayList<>();
        if (totalDues.compareTo(BigDecimal.ZERO) > 0) {
            alerts.add("Outstanding dues: ₹" + totalDues.toPlainString());
        }
        if (newAdmissionsThisWeek > 0) {
            alerts.add(newAdmissionsThisWeek + " new admission inquiries this week");
        }

        return new DigestPreviewDto(
                LocalDate.now(),
                totalStudents,
                activeStudents,
                feesCollectedToday,
                totalDues,
                newAdmissionsThisWeek,
                "N/A",
                alerts
        );
    }

    public DigestPreviewDto buildForCurrentTenant() {
        return buildForSchool(TenantContext.get());
    }
}
