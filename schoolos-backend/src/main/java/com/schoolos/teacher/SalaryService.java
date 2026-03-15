package com.schoolos.teacher;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.TEACHER_SALARY_PAYMENTS;
import static com.schoolos.jooq.Tables.TEACHERS;

@Service
public class SalaryService {

    private final DSLContext dsl;

    public SalaryService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<SalaryPaymentDto> listByTeacher(UUID teacherId) {
        UUID schoolId = TenantContext.get();
        // Verify teacher belongs to school
        int exists = dsl.fetchCount(
                dsl.selectFrom(TEACHERS)
                        .where(TEACHERS.ID.eq(teacherId))
                        .and(TEACHERS.SCHOOL_ID.eq(schoolId))
                        .and(TEACHERS.DELETED_AT.isNull())
        );
        if (exists == 0) throw new NoSuchElementException("Teacher not found");

        return dsl.selectFrom(TEACHER_SALARY_PAYMENTS)
                .where(TEACHER_SALARY_PAYMENTS.TEACHER_ID.eq(teacherId))
                .and(TEACHER_SALARY_PAYMENTS.DELETED_AT.isNull())
                .orderBy(TEACHER_SALARY_PAYMENTS.PAYMENT_DATE.desc())
                .fetchInto(SalaryPaymentDto.class);
    }

    public SalaryPaymentDto create(UUID teacherId, CreateSalaryPaymentRequest req) {
        UUID id = UUID.randomUUID();
        dsl.insertInto(TEACHER_SALARY_PAYMENTS)
                .set(TEACHER_SALARY_PAYMENTS.ID, id)
                .set(TEACHER_SALARY_PAYMENTS.TEACHER_ID, teacherId)
                .set(TEACHER_SALARY_PAYMENTS.AMOUNT, req.amount())
                .set(TEACHER_SALARY_PAYMENTS.PAYMENT_DATE, req.paymentDate())
                .set(TEACHER_SALARY_PAYMENTS.PAYMENT_MODE, req.paymentMode())
                .set(TEACHER_SALARY_PAYMENTS.MONTH_LABEL, req.monthLabel())
                .set(TEACHER_SALARY_PAYMENTS.REFERENCE_NUMBER, req.referenceNumber())
                .set(TEACHER_SALARY_PAYMENTS.NOTES, req.notes())
                .execute();
        return getById(teacherId, id);
    }

    public SalaryPaymentDto getById(UUID teacherId, UUID id) {
        SalaryPaymentDto payment = dsl.selectFrom(TEACHER_SALARY_PAYMENTS)
                .where(TEACHER_SALARY_PAYMENTS.ID.eq(id))
                .and(TEACHER_SALARY_PAYMENTS.TEACHER_ID.eq(teacherId))
                .and(TEACHER_SALARY_PAYMENTS.DELETED_AT.isNull())
                .fetchOneInto(SalaryPaymentDto.class);
        if (payment == null) throw new NoSuchElementException("Salary payment not found");
        return payment;
    }
}
