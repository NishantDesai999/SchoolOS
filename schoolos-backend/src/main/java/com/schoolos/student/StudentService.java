package com.schoolos.student;

import com.schoolos.common.StorageService;
import com.schoolos.common.TenantContext;
import com.schoolos.common.UrlResult;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.*;

@Service
public class StudentService {

    private final DSLContext dsl;
    private final StorageService storageService;

    public StudentService(DSLContext dsl, StorageService storageService) {
        this.dsl = dsl;
        this.storageService = storageService;
    }

    public record StudentPage(List<StudentDto> data, long total) {}

    public StudentPage list(String search, UUID yearId, UUID classId, UUID sectionId,
                            String status, int page, int size) {
        UUID schoolId = TenantContext.get();

        List<Condition> conditions = new ArrayList<>();
        conditions.add(STUDENTS.SCHOOL_ID.eq(schoolId));
        conditions.add(STUDENTS.DELETED_AT.isNull());

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.toLowerCase() + "%";
            conditions.add(
                DSL.lower(STUDENTS.FIRST_NAME).like(pattern)
                    .or(DSL.lower(STUDENTS.LAST_NAME).like(pattern))
                    .or(DSL.lower(STUDENTS.GR_NUMBER).like(pattern))
            );
        }
        if (status != null && !status.isBlank()) {
            conditions.add(STUDENTS.STATUS.eq(status));
        }

        Condition combined = conditions.stream().reduce(DSL.trueCondition(), Condition::and);

        // If filtering by section/class/year, join with enrollments
        if (sectionId != null || classId != null || yearId != null) {
            var query = dsl.selectDistinct(STUDENTS.fields())
                    .from(STUDENTS)
                    .join(STUDENT_ENROLLMENTS).on(STUDENT_ENROLLMENTS.STUDENT_ID.eq(STUDENTS.ID)
                            .and(STUDENT_ENROLLMENTS.DELETED_AT.isNull()));

            if (yearId != null) {
                query = query.where(STUDENT_ENROLLMENTS.CALENDAR_YEAR_ID.eq(yearId));
            }
            if (sectionId != null) {
                query = query.where(STUDENT_ENROLLMENTS.SECTION_ID.eq(sectionId));
            }
            if (classId != null) {
                query = query.where(STUDENT_ENROLLMENTS.SECTION_ID.in(
                        dsl.select(SECTIONS.ID).from(SECTIONS)
                                .where(SECTIONS.CLASS_ID.eq(classId))
                                .and(SECTIONS.DELETED_AT.isNull())
                ));
            }

            query = query.where(combined);

            long total = dsl.fetchCount(query);
            List<StudentDto> data = query
                    .orderBy(STUDENTS.FIRST_NAME.asc())
                    .limit(size).offset((long) page * size)
                    .fetchInto(StudentDto.class);
            return new StudentPage(data, total);
        }

        long total = dsl.fetchCount(dsl.selectFrom(STUDENTS).where(combined));
        List<StudentDto> data = dsl.selectFrom(STUDENTS)
                .where(combined)
                .orderBy(STUDENTS.FIRST_NAME.asc())
                .limit(size).offset((long) page * size)
                .fetchInto(StudentDto.class);

        return new StudentPage(data, total);
    }

    @Transactional
    public StudentDto create(CreateStudentRequest req) {
        UUID schoolId = TenantContext.get();
        UUID id = UUID.randomUUID();

        // Generate GR number
        String grNumber = generateGrNumber(schoolId);

        dsl.insertInto(STUDENTS)
                .set(STUDENTS.ID, id)
                .set(STUDENTS.SCHOOL_ID, schoolId)
                .set(STUDENTS.GR_NUMBER, grNumber)
                .set(STUDENTS.FIRST_NAME, req.firstName())
                .set(STUDENTS.LAST_NAME, req.lastName())
                .set(STUDENTS.DATE_OF_BIRTH, req.dateOfBirth())
                .set(STUDENTS.GENDER, req.gender())
                .set(STUDENTS.BLOOD_GROUP, req.bloodGroup())
                .set(STUDENTS.AADHAAR_NUMBER, req.aadhaarNumber())
                .set(STUDENTS.ADMISSION_DATE, req.admissionDate())
                .set(STUDENTS.CATEGORY, req.category())
                .set(STUDENTS.IS_RTE, req.isRte() != null ? req.isRte() : false)
                .set(STUDENTS.STATUS, "ACTIVE")
                .execute();

        // Create enrollment if year/section provided
        if (req.calendarYearId() != null && req.sectionId() != null) {
            dsl.insertInto(STUDENT_ENROLLMENTS)
                    .set(STUDENT_ENROLLMENTS.ID, UUID.randomUUID())
                    .set(STUDENT_ENROLLMENTS.STUDENT_ID, id)
                    .set(STUDENT_ENROLLMENTS.SECTION_ID, req.sectionId())
                    .set(STUDENT_ENROLLMENTS.CALENDAR_YEAR_ID, req.calendarYearId())
                    .set(STUDENT_ENROLLMENTS.ROLL_NUMBER, req.rollNumber())
                    .set(STUDENT_ENROLLMENTS.ENROLLMENT_DATE, LocalDate.now())
                    .set(STUDENT_ENROLLMENTS.STATUS, "ENROLLED")
                    .execute();
        }

        // Create guardians
        if (req.guardians() != null) {
            for (var g : req.guardians()) {
                UUID guardianId = UUID.randomUUID();
                dsl.insertInto(GUARDIANS)
                        .set(GUARDIANS.ID, guardianId)
                        .set(GUARDIANS.NAME, g.name())
                        .set(GUARDIANS.RELATION, g.relation())
                        .set(GUARDIANS.PHONE, g.phone())
                        .set(GUARDIANS.EMAIL, g.email())
                        .set(GUARDIANS.OCCUPATION, g.occupation())
                        .execute();
                dsl.insertInto(STUDENT_GUARDIANS)
                        .set(STUDENT_GUARDIANS.STUDENT_ID, id)
                        .set(STUDENT_GUARDIANS.GUARDIAN_ID, guardianId)
                        .set(STUDENT_GUARDIANS.IS_PRIMARY, g.isPrimary())
                        .execute();
            }
        }

        return getById(id);
    }

    public StudentDetailDto getDetail(UUID id) {
        UUID schoolId = TenantContext.get();
        StudentDto student = dsl.selectFrom(STUDENTS)
                .where(STUDENTS.ID.eq(id))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.DELETED_AT.isNull())
                .fetchOneInto(StudentDto.class);
        if (student == null) throw new NoSuchElementException("Student not found");

        List<EnrollmentDto> enrollments = dsl.selectFrom(STUDENT_ENROLLMENTS)
                .where(STUDENT_ENROLLMENTS.STUDENT_ID.eq(id))
                .and(STUDENT_ENROLLMENTS.DELETED_AT.isNull())
                .orderBy(STUDENT_ENROLLMENTS.CREATED_AT.desc())
                .fetchInto(EnrollmentDto.class);

        List<GuardianDto> guardians = dsl.select(
                        GUARDIANS.ID, GUARDIANS.NAME, GUARDIANS.RELATION, GUARDIANS.PHONE,
                        GUARDIANS.EMAIL, GUARDIANS.OCCUPATION, STUDENT_GUARDIANS.IS_PRIMARY,
                        GUARDIANS.CREATED_AT)
                .from(GUARDIANS)
                .join(STUDENT_GUARDIANS).on(STUDENT_GUARDIANS.GUARDIAN_ID.eq(GUARDIANS.ID))
                .where(STUDENT_GUARDIANS.STUDENT_ID.eq(id))
                .and(GUARDIANS.DELETED_AT.isNull())
                .fetchInto(GuardianDto.class);

        return new StudentDetailDto(student, enrollments, guardians);
    }

    public StudentDto getById(UUID id) {
        UUID schoolId = TenantContext.get();
        StudentDto student = dsl.selectFrom(STUDENTS)
                .where(STUDENTS.ID.eq(id))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.DELETED_AT.isNull())
                .fetchOneInto(StudentDto.class);
        if (student == null) throw new NoSuchElementException("Student not found");
        return student;
    }

    public StudentDto update(UUID id, UpdateStudentRequest req) {
        UUID schoolId = TenantContext.get();
        var update = dsl.update(STUDENTS).set(STUDENTS.UPDATED_AT, OffsetDateTime.now());
        if (req.firstName() != null) update = update.set(STUDENTS.FIRST_NAME, req.firstName());
        if (req.lastName() != null) update = update.set(STUDENTS.LAST_NAME, req.lastName());
        if (req.dateOfBirth() != null) update = update.set(STUDENTS.DATE_OF_BIRTH, req.dateOfBirth());
        if (req.gender() != null) update = update.set(STUDENTS.GENDER, req.gender());
        if (req.bloodGroup() != null) update = update.set(STUDENTS.BLOOD_GROUP, req.bloodGroup());
        if (req.aadhaarNumber() != null) update = update.set(STUDENTS.AADHAAR_NUMBER, req.aadhaarNumber());
        if (req.category() != null) update = update.set(STUDENTS.CATEGORY, req.category());
        if (req.isRte() != null) update = update.set(STUDENTS.IS_RTE, req.isRte());
        update.where(STUDENTS.ID.eq(id)).and(STUDENTS.SCHOOL_ID.eq(schoolId)).execute();
        return getById(id);
    }

    public void delete(UUID id) {
        UUID schoolId = TenantContext.get();
        dsl.update(STUDENTS)
                .set(STUDENTS.DELETED_AT, OffsetDateTime.now())
                .where(STUDENTS.ID.eq(id))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .execute();
    }

    public UrlResult uploadPhoto(UUID id, MultipartFile file) {
        UUID schoolId = TenantContext.get();
        String url = storageService.store(file, "student-photos");
        dsl.update(STUDENTS)
                .set(STUDENTS.PHOTO_URL, url)
                .set(STUDENTS.UPDATED_AT, OffsetDateTime.now())
                .where(STUDENTS.ID.eq(id))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .execute();
        return UrlResult.of(url);
    }

    public StudentDto changeStatus(UUID id, String status) {
        UUID schoolId = TenantContext.get();
        dsl.update(STUDENTS)
                .set(STUDENTS.STATUS, status)
                .set(STUDENTS.UPDATED_AT, OffsetDateTime.now())
                .where(STUDENTS.ID.eq(id))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .execute();
        return getById(id);
    }

    public StudentDto getByGrNumber(String grNumber) {
        UUID schoolId = TenantContext.get();
        StudentDto student = dsl.selectFrom(STUDENTS)
                .where(STUDENTS.GR_NUMBER.eq(grNumber))
                .and(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.DELETED_AT.isNull())
                .fetchOneInto(StudentDto.class);
        if (student == null) throw new NoSuchElementException("Student not found with GR: " + grNumber);
        return student;
    }

    private String generateGrNumber(UUID schoolId) {
        // Get school code
        String code = dsl.select(SCHOOLS.CODE)
                .from(SCHOOLS)
                .where(SCHOOLS.ID.eq(schoolId))
                .fetchOneInto(String.class);
        if (code == null) code = "SCH";

        int year = java.time.LocalDate.now().getYear();

        Integer maxSeq = dsl.select(
                        DSL.max(DSL.cast(
                                DSL.substring(STUDENTS.GR_NUMBER, code.length() + 5),
                                Integer.class)))
                .from(STUDENTS)
                .where(STUDENTS.SCHOOL_ID.eq(schoolId))
                .and(STUDENTS.GR_NUMBER.startsWith(code + year))
                .fetchOneInto(Integer.class);

        int seq = (maxSeq == null ? 0 : maxSeq) + 1;
        return code + year + String.format("%05d", seq);
    }
}
