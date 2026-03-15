package com.schoolos.teacher;

import com.schoolos.common.StorageService;
import com.schoolos.common.TenantContext;
import com.schoolos.common.UrlResult;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.TEACHERS;

@Service
public class TeacherService {

    private final DSLContext dsl;
    private final StorageService storageService;

    public TeacherService(DSLContext dsl, StorageService storageService) {
        this.dsl = dsl;
        this.storageService = storageService;
    }

    public record TeacherPage(List<TeacherDto> data, long total) {}

    public TeacherPage list(String search, int page, int size) {
        UUID schoolId = TenantContext.get();
        List<Condition> conditions = new ArrayList<>();
        conditions.add(TEACHERS.SCHOOL_ID.eq(schoolId));
        conditions.add(TEACHERS.DELETED_AT.isNull());

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.toLowerCase() + "%";
            conditions.add(
                DSL.lower(TEACHERS.FIRST_NAME).like(pattern)
                    .or(DSL.lower(TEACHERS.LAST_NAME).like(pattern))
                    .or(DSL.lower(TEACHERS.EMPLOYEE_ID).like(pattern))
                    .or(DSL.lower(TEACHERS.PHONE).like(pattern))
            );
        }

        Condition combined = conditions.stream().reduce(DSL.trueCondition(), Condition::and);

        long total = dsl.fetchCount(dsl.selectFrom(TEACHERS).where(combined));
        List<TeacherDto> data = dsl.selectFrom(TEACHERS)
                .where(combined)
                .orderBy(TEACHERS.FIRST_NAME.asc())
                .limit(size).offset((long) page * size)
                .fetchInto(TeacherDto.class);

        return new TeacherPage(data, total);
    }

    public TeacherDto create(CreateTeacherRequest req) {
        UUID schoolId = TenantContext.get();
        UUID id = UUID.randomUUID();
        String employeeId = generateEmployeeId(schoolId);

        dsl.insertInto(TEACHERS)
                .set(TEACHERS.ID, id)
                .set(TEACHERS.SCHOOL_ID, schoolId)
                .set(TEACHERS.EMPLOYEE_ID, employeeId)
                .set(TEACHERS.FIRST_NAME, req.firstName())
                .set(TEACHERS.LAST_NAME, req.lastName())
                .set(TEACHERS.PHONE, req.phone())
                .set(TEACHERS.EMAIL, req.email())
                .set(TEACHERS.DATE_OF_BIRTH, req.dateOfBirth())
                .set(TEACHERS.GENDER, req.gender())
                .set(TEACHERS.QUALIFICATION, req.qualification())
                .set(TEACHERS.SPECIALIZATION, req.specialization())
                .set(TEACHERS.DATE_OF_JOINING, req.dateOfJoining())
                .set(TEACHERS.DESIGNATION, req.designation())
                .set(TEACHERS.MONTHLY_SALARY, req.monthlySalary())
                .set(TEACHERS.BANK_ACCOUNT, req.bankAccount())
                .set(TEACHERS.BANK_IFSC, req.bankIfsc())
                .set(TEACHERS.STATUS, "ACTIVE")
                .execute();

        return getById(id);
    }

    public TeacherDto getById(UUID id) {
        UUID schoolId = TenantContext.get();
        TeacherDto teacher = dsl.selectFrom(TEACHERS)
                .where(TEACHERS.ID.eq(id))
                .and(TEACHERS.SCHOOL_ID.eq(schoolId))
                .and(TEACHERS.DELETED_AT.isNull())
                .fetchOneInto(TeacherDto.class);
        if (teacher == null) throw new NoSuchElementException("Teacher not found");
        return teacher;
    }

    public TeacherDto update(UUID id, CreateTeacherRequest req) {
        UUID schoolId = TenantContext.get();
        var update = dsl.update(TEACHERS).set(TEACHERS.UPDATED_AT, OffsetDateTime.now());
        if (req.firstName() != null) update = update.set(TEACHERS.FIRST_NAME, req.firstName());
        if (req.lastName() != null) update = update.set(TEACHERS.LAST_NAME, req.lastName());
        if (req.phone() != null) update = update.set(TEACHERS.PHONE, req.phone());
        if (req.email() != null) update = update.set(TEACHERS.EMAIL, req.email());
        if (req.dateOfBirth() != null) update = update.set(TEACHERS.DATE_OF_BIRTH, req.dateOfBirth());
        if (req.gender() != null) update = update.set(TEACHERS.GENDER, req.gender());
        if (req.qualification() != null) update = update.set(TEACHERS.QUALIFICATION, req.qualification());
        if (req.specialization() != null) update = update.set(TEACHERS.SPECIALIZATION, req.specialization());
        if (req.dateOfJoining() != null) update = update.set(TEACHERS.DATE_OF_JOINING, req.dateOfJoining());
        if (req.designation() != null) update = update.set(TEACHERS.DESIGNATION, req.designation());
        if (req.monthlySalary() != null) update = update.set(TEACHERS.MONTHLY_SALARY, req.monthlySalary());
        update.where(TEACHERS.ID.eq(id)).and(TEACHERS.SCHOOL_ID.eq(schoolId)).execute();
        return getById(id);
    }

    public void delete(UUID id) {
        UUID schoolId = TenantContext.get();
        dsl.update(TEACHERS)
                .set(TEACHERS.DELETED_AT, OffsetDateTime.now())
                .where(TEACHERS.ID.eq(id))
                .and(TEACHERS.SCHOOL_ID.eq(schoolId))
                .execute();
    }

    public UrlResult uploadPhoto(UUID id, MultipartFile file) {
        UUID schoolId = TenantContext.get();
        String url = storageService.store(file, "teacher-photos");
        dsl.update(TEACHERS)
                .set(TEACHERS.PHOTO_URL, url)
                .set(TEACHERS.UPDATED_AT, OffsetDateTime.now())
                .where(TEACHERS.ID.eq(id))
                .and(TEACHERS.SCHOOL_ID.eq(schoolId))
                .execute();
        return UrlResult.of(url);
    }

    public TeacherDto toggleStatus(UUID id) {
        UUID schoolId = TenantContext.get();
        TeacherDto current = getById(id);
        String newStatus = "ACTIVE".equals(current.status()) ? "RESIGNED" : "ACTIVE";
        dsl.update(TEACHERS)
                .set(TEACHERS.STATUS, newStatus)
                .set(TEACHERS.UPDATED_AT, OffsetDateTime.now())
                .where(TEACHERS.ID.eq(id))
                .and(TEACHERS.SCHOOL_ID.eq(schoolId))
                .execute();
        return getById(id);
    }

    private String generateEmployeeId(UUID schoolId) {
        Integer count = dsl.fetchCount(
                dsl.selectFrom(TEACHERS).where(TEACHERS.SCHOOL_ID.eq(schoolId))
        );
        return "EMP" + String.format("%04d", count + 1);
    }
}
