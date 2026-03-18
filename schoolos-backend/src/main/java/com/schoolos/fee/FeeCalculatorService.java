package com.schoolos.fee;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;
import static org.jooq.impl.DSL.field;
import static org.jooq.impl.DSL.name;

@Service
public class FeeCalculatorService {

    private final DSLContext dsl;

    public FeeCalculatorService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public FeeCalculationResult calculate(String grNumber, Integer calendarYear) {
        UUID schoolId = TenantContext.get();

        var student = dsl.selectFrom(STUDENTS)
                .where(STUDENTS.GR_NUMBER.eq(grNumber))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.DELETED_AT.isNull())
                .fetchOne();
        if (student == null) throw new NoSuchElementException("Student not found with GR: " + grNumber);

        Integer gradeLevel = null;
        if (calendarYear != null) {
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

        List<FeeCalculationResult.DiscountApplied> discounts = new ArrayList<>();
        BigDecimal discountTotal = BigDecimal.ZERO;

        boolean isRte = Boolean.TRUE.equals(student.get(STUDENTS.IS_RTE));
        if (isRte) {
            discountTotal = total;
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

    public FeeCalculationResult calculateByGrade(Integer calendarYear, Integer gradeLevel, int months) {
        UUID schoolId = TenantContext.get();

        var feeConfig = dsl.selectFrom(FEE_CONFIGS)
                .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                .and(FEE_CONFIGS.CALENDAR_YEAR.eq(calendarYear))
                .and(FEE_CONFIGS.GRADE_LEVEL.eq(gradeLevel))
                .and(FEE_CONFIGS.DELETED_AT.isNull())
                .fetchOne();

        if (feeConfig == null)
            throw new NoSuchElementException("No fee config found for grade " + gradeLevel + " year " + calendarYear);

        List<FeeBreakdownItemDto> items = dsl.selectFrom(FEE_BREAKDOWN_ITEMS)
                .where(FEE_BREAKDOWN_ITEMS.FEE_CONFIG_ID.eq(feeConfig.get(FEE_CONFIGS.ID)))
                .and(FEE_BREAKDOWN_ITEMS.DELETED_AT.isNull())
                .orderBy(FEE_BREAKDOWN_ITEMS.DISPLAY_ORDER.asc())
                .fetchInto(FeeBreakdownItemDto.class);

        BigDecimal monthlyTotal = items.stream()
                .map(FeeBreakdownItemDto::value)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal grandTotal = monthlyTotal.multiply(BigDecimal.valueOf(months));

        return new FeeCalculationResult(null, null, gradeLevel, calendarYear, grandTotal, grandTotal, items, List.of());
    }

    /**
     * Calculate fees for a specific student over a from/to month range.
     * Handles TERM_FEE duplicate-payment protection.
     *
     * @param studentId  student UUID
     * @param fromMonth  inclusive start "YYYY-MM"
     * @param toMonth    inclusive end   "YYYY-MM"
     */
    public StudentFeeCalculationDto calculateForStudent(UUID studentId, String fromMonth, String toMonth) {
        UUID schoolId = TenantContext.get();

        // Load student
        var student = dsl.selectFrom(STUDENTS)
                .where(STUDENTS.ID.eq(studentId))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.DELETED_AT.isNull())
                .fetchOne();
        if (student == null) throw new NoSuchElementException("Student not found");

        YearMonth from = YearMonth.parse(fromMonth);
        YearMonth to   = YearMonth.parse(toMonth);
        if (from.isAfter(to)) throw new IllegalArgumentException("fromMonth must be <= toMonth");

        // School year = the year whose June falls within or before fromMonth
        int schoolYear = from.getMonthValue() >= 6 ? from.getYear() : from.getYear() - 1;

        // Find most recent enrollment to get grade level + class name
        var enrollmentRow = dsl.select(
                        CLASSES.GRADE_LEVEL, CLASSES.NAME)
                .from(STUDENT_ENROLLMENTS)
                .join(SECTIONS).on(SECTIONS.ID.eq(STUDENT_ENROLLMENTS.SECTION_ID))
                .join(CLASSES).on(CLASSES.ID.eq(SECTIONS.CLASS_ID))
                .where(STUDENT_ENROLLMENTS.STUDENT_ID.eq(studentId))
                .and(STUDENT_ENROLLMENTS.DELETED_AT.isNull())
                .orderBy(STUDENT_ENROLLMENTS.CREATED_AT.desc())
                .limit(1)
                .fetchOne();

        if (enrollmentRow == null) throw new IllegalArgumentException("Student has no enrollment");

        int gradeLevel = enrollmentRow.value1();
        String className = enrollmentRow.value2();

        // Load fee config for school year + grade
        var feeConfig = dsl.selectFrom(FEE_CONFIGS)
                .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                .and(FEE_CONFIGS.CALENDAR_YEAR.eq(schoolYear))
                .and(FEE_CONFIGS.GRADE_LEVEL.eq(gradeLevel))
                .and(FEE_CONFIGS.DELETED_AT.isNull())
                .fetchOne();

        if (feeConfig == null)
            throw new NoSuchElementException("No fee config found for grade " + gradeLevel + " year " + schoolYear);

        List<FeeBreakdownItemDto> breakdownItems = dsl.selectFrom(FEE_BREAKDOWN_ITEMS)
                .where(FEE_BREAKDOWN_ITEMS.FEE_CONFIG_ID.eq(feeConfig.get(FEE_CONFIGS.ID)))
                .and(FEE_BREAKDOWN_ITEMS.DELETED_AT.isNull())
                .orderBy(FEE_BREAKDOWN_ITEMS.DISPLAY_ORDER.asc())
                .fetchInto(FeeBreakdownItemDto.class);

        int numMonths = monthsBetween(from, to);

        // H1: June–November of start year;  H2: December–May (Dec of start year + Jan-May of start+1)
        YearMonth h1Start = YearMonth.of(schoolYear, 6);
        YearMonth h1End   = YearMonth.of(schoolYear, 11);
        YearMonth h2Start = YearMonth.of(schoolYear, 12);
        YearMonth h2End   = YearMonth.of(schoolYear + 1, 5);

        boolean rangeOverlapsH1 = !from.isAfter(h1End)  && !to.isBefore(h1Start);
        boolean rangeOverlapsH2 = !from.isAfter(h2End)  && !to.isBefore(h2Start);

        List<FeeLineItem> lineItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (FeeBreakdownItemDto item : breakdownItems) {
            String type = item.type();

            if ("TERM_FEE".equals(type)) {
                // Check H1
                if (rangeOverlapsH1) {
                    boolean h1Paid = hasTermFeePaid(studentId, h1Start.toString(), h1End.toString());
                    FeeLineItem li = new FeeLineItem(
                            item.id(),
                            "TERM_FEE_H1",
                            item.type() + " – H1 (" + h1Start.getMonth().name().substring(0, 3) + "–" + h1End.getMonth().name().substring(0, 3) + ")",
                            item.value(),
                            1,
                            h1Paid ? BigDecimal.ZERO : item.value(),
                            h1Paid,
                            h1Paid ? "Already collected for H1" : null
                    );
                    lineItems.add(li);
                    if (!h1Paid) subtotal = subtotal.add(item.value());
                }
                // Check H2
                if (rangeOverlapsH2) {
                    boolean h2Paid = hasTermFeePaid(studentId, h2Start.toString(), h2End.toString());
                    FeeLineItem li = new FeeLineItem(
                            item.id(),
                            "TERM_FEE_H2",
                            item.type() + " – H2 (" + h2Start.getMonth().name().substring(0, 3) + "–" + h2End.getMonth().name().substring(0, 3) + ")",
                            item.value(),
                            1,
                            h2Paid ? BigDecimal.ZERO : item.value(),
                            h2Paid,
                            h2Paid ? "Already collected for H2" : null
                    );
                    lineItems.add(li);
                    if (!h2Paid) subtotal = subtotal.add(item.value());
                }
            } else {
                // MONTHLY: multiply by numMonths; ANNUAL/ONE_TIME: include once
                String frequency = item.frequency();
                int multiplier = "MONTHLY".equals(frequency) ? numMonths : 1;
                BigDecimal lineTotal = item.value().multiply(BigDecimal.valueOf(multiplier));
                lineItems.add(new FeeLineItem(
                        item.id(),
                        type,
                        item.type(),
                        item.value(),
                        multiplier,
                        lineTotal,
                        false,
                        null
                ));
                subtotal = subtotal.add(lineTotal);
            }
        }

        String studentName = student.get(STUDENTS.FIRST_NAME) + " " + student.get(STUDENTS.LAST_NAME);
        String grNumber    = student.get(STUDENTS.GR_NUMBER);
        String schoolYearLabel = schoolYear + "-" + String.valueOf(schoolYear + 1).substring(2);

        return new StudentFeeCalculationDto(
                studentId, studentName, grNumber, className,
                gradeLevel, schoolYearLabel,
                fromMonth, toMonth, numMonths,
                lineItems, subtotal, subtotal
        );
    }

    /** Count months inclusive between two YearMonth values */
    private int monthsBetween(YearMonth from, YearMonth to) {
        return (int) (from.until(to, java.time.temporal.ChronoUnit.MONTHS) + 1);
    }

    /**
     * Check if a TERM_FEE invoice already exists for this student covering any part of the given half range.
     * We check if any paid invoice has from_month within [hStart, hEnd].
     */
    private boolean hasTermFeePaid(UUID studentId, String hStart, String hEnd) {
        Integer count = dsl.fetchCount(
                dsl.select(FEE_INVOICES.ID)
                        .from(FEE_INVOICES)
                        .join(FEE_INVOICE_ITEMS).on(FEE_INVOICE_ITEMS.INVOICE_ID.eq(FEE_INVOICES.ID))
                        .where(FEE_INVOICES.STUDENT_ID.eq(studentId))
                        .and(FEE_INVOICES.STATUS.in("PAID", "PARTIAL"))
                        .and(FEE_INVOICES.DELETED_AT.isNull())
                        .and(FEE_INVOICE_ITEMS.DELETED_AT.isNull())
                        .and(FEE_INVOICE_ITEMS.TYPE_LABEL.like("TERM_FEE%"))
                        .and(field(name("fee_invoices", "from_month"), String.class).greaterOrEqual(hStart))
                        .and(field(name("fee_invoices", "from_month"), String.class).lessOrEqual(hEnd))
        );
        return count != null && count > 0;
    }
}
