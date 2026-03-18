package com.schoolos.student;

import com.schoolos.common.TenantContext;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;

@Service
public class AdmissionService {

    private final DSLContext dsl;
    private final StudentService studentService;

    public AdmissionService(DSLContext dsl, StudentService studentService) {
        this.dsl = dsl;
        this.studentService = studentService;
    }

    public record AdmissionPage(List<AdmissionDto> data, long total) {}

    public AdmissionPage list(String search, String status, int page, int size) {
        UUID schoolId = TenantContext.get();
        List<Condition> conditions = new ArrayList<>();
        conditions.add(ADMISSION_APPLICATIONS.SCHOOL_ID.eq(schoolId));
        conditions.add(ADMISSION_APPLICATIONS.DELETED_AT.isNull());

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.toLowerCase() + "%";
            conditions.add(
                DSL.lower(ADMISSION_APPLICATIONS.STUDENT_NAME).like(pattern)
                    .or(DSL.lower(ADMISSION_APPLICATIONS.GUARDIAN_NAME).like(pattern))
                    .or(DSL.lower(ADMISSION_APPLICATIONS.GUARDIAN_PHONE).like(pattern))
            );
        }
        if (status != null && !status.isBlank()) {
            conditions.add(ADMISSION_APPLICATIONS.STATUS.eq(status));
        }

        Condition combined = conditions.stream().reduce(DSL.trueCondition(), Condition::and);

        long total = dsl.fetchCount(dsl.selectFrom(ADMISSION_APPLICATIONS).where(combined));
        List<AdmissionDto> data = dsl.selectFrom(ADMISSION_APPLICATIONS)
                .where(combined)
                .orderBy(ADMISSION_APPLICATIONS.APPLIED_AT.desc())
                .limit(size).offset((long) page * size)
                .fetchInto(AdmissionDto.class);

        return new AdmissionPage(data, total);
    }

    public AdmissionDto getById(UUID id) {
        UUID schoolId = TenantContext.get();
        AdmissionDto app = dsl.selectFrom(ADMISSION_APPLICATIONS)
                .where(ADMISSION_APPLICATIONS.ID.eq(id))
                .and(ADMISSION_APPLICATIONS.SCHOOL_ID.eq(schoolId))
                .and(ADMISSION_APPLICATIONS.DELETED_AT.isNull())
                .fetchOneInto(AdmissionDto.class);
        if (app == null) throw new NoSuchElementException("Admission application not found");
        return app;
    }

    public AdmissionDto updateStatus(UUID id, String status) {
        UUID schoolId = TenantContext.get();
        dsl.update(ADMISSION_APPLICATIONS)
                .set(ADMISSION_APPLICATIONS.STATUS, status)
                .set(ADMISSION_APPLICATIONS.UPDATED_AT, OffsetDateTime.now())
                .where(ADMISSION_APPLICATIONS.ID.eq(id))
                .and(ADMISSION_APPLICATIONS.SCHOOL_ID.eq(schoolId))
                .execute();
        return getById(id);
    }

    @Transactional
    public StudentDto convertToStudent(UUID admissionId) {
        UUID schoolId = TenantContext.get();
        AdmissionDto app = getById(admissionId);

        // Parse name
        String[] nameParts = app.studentName().split(" ", 2);
        String firstName = nameParts[0];
        String lastName = nameParts.length > 1 ? nameParts[1] : "";

        CreateStudentRequest req = new CreateStudentRequest(
                firstName, lastName,
                app.dob(),
                "M", // default gender
                null, null,
                LocalDate.now(),
                null, false,
                app.calendarYearId(), null, null,
                List.of(new CreateStudentRequest.GuardianInput(
                        app.guardianName(), "GUARDIAN",
                        app.guardianPhone(), app.guardianEmail(),
                        null, true
                ))
        );

        StudentDto student = studentService.create(req);

        // Update admission status to ENROLLED
        dsl.update(ADMISSION_APPLICATIONS)
                .set(ADMISSION_APPLICATIONS.STATUS, "ENROLLED")
                .set(ADMISSION_APPLICATIONS.UPDATED_AT, OffsetDateTime.now())
                .where(ADMISSION_APPLICATIONS.ID.eq(admissionId))
                .execute();

        return student;
    }
}
