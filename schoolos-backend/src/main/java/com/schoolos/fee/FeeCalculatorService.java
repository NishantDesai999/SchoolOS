package com.schoolos.fee;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;

@Service
public class FeeCalculatorService {

    private final DSLContext dsl;

    public FeeCalculatorService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public FeeCalculationResult calculate(String grNumber, Integer calendarYear) {
        UUID schoolId = TenantContext.get();

        // Find student
        var student = dsl.selectFrom(STUDENTS)
                .where(STUDENTS.GR_NUMBER.eq(grNumber))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.DELETED_AT.isNull())
                .fetchOne();
        if (student == null) throw new NoSuchElementException("Student not found with GR: " + grNumber);

        // Find enrollment to get grade level
        Integer gradeLevel = null;
        if (calendarYear != null) {
            // Look up enrollment for the given year
            var enrollment = dsl.select(SECTIONS.CLASS_ID)
                    .from(STUDENT_ENROLLMENTS)
                    .join(SECTIONS).on(SECTIONS.ID.eq(STUDENT_ENROLLMENTS.SECTION_ID))
                    .join(CALENDAR_YEARS).on(CALENDAR_YEARS.ID.eq(STUDENT_ENROLLMENTS.CALENDAR_YEAR_ID))
                    .where(STUDENT_ENROLLMENTS.STUDENT_ID.eq(student.get(STUDENTS.ID)))
                    .and(CALENDAR_YEARS.YEAR.eq(calendarYear))
                    .and(STUDENT_ENROLLMENTS.DELETED_AT.isNull())
                    .fetchOne();

            if (enrollment != null) {
                var cls = dsl.selectFrom(CLASSES)
                        .where(CLASSES.ID.eq(enrollment.value1()))
                        .fetchOne();
                if (cls != null) gradeLevel = cls.get(CLASSES.GRADE_LEVEL);
            }
        }

        if (gradeLevel == null) {
            // Try to get from most recent enrollment
            var latestEnrollment = dsl.select(SECTIONS.CLASS_ID)
                    .from(STUDENT_ENROLLMENTS)
                    .join(SECTIONS).on(SECTIONS.ID.eq(STUDENT_ENROLLMENTS.SECTION_ID))
                    .where(STUDENT_ENROLLMENTS.STUDENT_ID.eq(student.get(STUDENTS.ID)))
                    .and(STUDENT_ENROLLMENTS.DELETED_AT.isNull())
                    .orderBy(STUDENT_ENROLLMENTS.CREATED_AT.desc())
                    .limit(1)
                    .fetchOne();
            if (latestEnrollment != null) {
                var cls = dsl.selectFrom(CLASSES)
                        .where(CLASSES.ID.eq(latestEnrollment.value1()))
                        .fetchOne();
                if (cls != null) gradeLevel = cls.get(CLASSES.GRADE_LEVEL);
            }
        }

        if (gradeLevel == null) throw new IllegalArgumentException("Cannot determine grade level for student");

        int year = calendarYear != null ? calendarYear : java.time.LocalDate.now().getYear();

        // Find fee config
        var feeConfig = dsl.selectFrom(FEE_CONFIGS)
                .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                .and(FEE_CONFIGS.CALENDAR_YEAR.eq(year))
                .and(FEE_CONFIGS.GRADE_LEVEL.eq(gradeLevel))
                .and(FEE_CONFIGS.DELETED_AT.isNull())
                .fetchOne();

        if (feeConfig == null) throw new NoSuchElementException("No fee config found for grade " + gradeLevel + " year " + year);

        List<FeeBreakdownItemDto> items = dsl.selectFrom(FEE_BREAKDOWN_ITEMS)
                .where(FEE_BREAKDOWN_ITEMS.FEE_CONFIG_ID.eq(feeConfig.get(FEE_CONFIGS.ID)))
                .and(FEE_BREAKDOWN_ITEMS.DELETED_AT.isNull())
                .orderBy(FEE_BREAKDOWN_ITEMS.DISPLAY_ORDER.asc())
                .fetchInto(FeeBreakdownItemDto.class);

        BigDecimal total = items.stream()
                .map(FeeBreakdownItemDto::value)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Check for applicable discounts (RTE, etc.)
        List<FeeCalculationResult.DiscountApplied> discounts = new ArrayList<>();
        BigDecimal discountTotal = BigDecimal.ZERO;

        boolean isRte = Boolean.TRUE.equals(student.get(STUDENTS.IS_RTE));
        if (isRte) {
            discountTotal = total; // Full fee waiver for RTE
            discounts.add(new FeeCalculationResult.DiscountApplied("RTE Fee Waiver", "PERCENTAGE", BigDecimal.valueOf(100), total));
        }

        BigDecimal netAmount = total.subtract(discountTotal);

        return new FeeCalculationResult(
                student.get(STUDENTS.ID),
                grNumber,
                gradeLevel,
                year,
                total,
                netAmount,
                items,
                discounts
        );
    }
}
