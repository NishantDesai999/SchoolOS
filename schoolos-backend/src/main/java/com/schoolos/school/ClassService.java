package com.schoolos.school;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static com.schoolos.jooq.Tables.CLASSES;
import static com.schoolos.jooq.Tables.SECTIONS;

@Service
public class ClassService {

    private final DSLContext dsl;

    public ClassService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<ClassDto> listByYear(UUID yearId) {
        UUID schoolId = TenantContext.get();
        return dsl.selectFrom(CLASSES)
                .where(CLASSES.SCHOOL_ID.eq(schoolId))
                .and(CLASSES.CALENDAR_YEAR_ID.eq(yearId))
                .and(CLASSES.DELETED_AT.isNull())
                .orderBy(CLASSES.DISPLAY_ORDER.asc(), CLASSES.GRADE_LEVEL.asc())
                .fetchInto(ClassDto.class);
    }

    public ClassDto create(CreateClassRequest req) {
        UUID schoolId = TenantContext.get();
        UUID id = UUID.randomUUID();

        dsl.insertInto(CLASSES)
                .set(CLASSES.ID, id)
                .set(CLASSES.SCHOOL_ID, schoolId)
                .set(CLASSES.CALENDAR_YEAR_ID, req.calendarYearId())
                .set(CLASSES.NAME, req.name())
                .set(CLASSES.GRADE_LEVEL, req.gradeLevel())
                .set(CLASSES.DISPLAY_ORDER, req.displayOrder() != null ? req.displayOrder() : 0)
                .execute();

        return dsl.selectFrom(CLASSES)
                .where(CLASSES.ID.eq(id))
                .fetchOneInto(ClassDto.class);
    }

    public void delete(UUID id) {
        UUID schoolId = TenantContext.get();
        dsl.update(CLASSES)
                .set(CLASSES.DELETED_AT, OffsetDateTime.now())
                .where(CLASSES.ID.eq(id))
                .and(CLASSES.SCHOOL_ID.eq(schoolId))
                .execute();
    }

    @Transactional
    public void cloneClassesAndSections(UUID sourceYearId, UUID targetYearId) {
        UUID schoolId = TenantContext.get();

        List<ClassDto> sourceClasses = dsl.selectFrom(CLASSES)
                .where(CLASSES.SCHOOL_ID.eq(schoolId))
                .and(CLASSES.CALENDAR_YEAR_ID.eq(sourceYearId))
                .and(CLASSES.DELETED_AT.isNull())
                .fetchInto(ClassDto.class);

        for (ClassDto sourceClass : sourceClasses) {
            UUID newClassId = UUID.randomUUID();
            dsl.insertInto(CLASSES)
                    .set(CLASSES.ID, newClassId)
                    .set(CLASSES.SCHOOL_ID, schoolId)
                    .set(CLASSES.CALENDAR_YEAR_ID, targetYearId)
                    .set(CLASSES.NAME, sourceClass.name())
                    .set(CLASSES.GRADE_LEVEL, sourceClass.gradeLevel())
                    .set(CLASSES.DISPLAY_ORDER, sourceClass.displayOrder())
                    .execute();

            List<SectionDto> sourceSections = dsl.selectFrom(SECTIONS)
                    .where(SECTIONS.CLASS_ID.eq(sourceClass.id()))
                    .and(SECTIONS.DELETED_AT.isNull())
                    .fetchInto(SectionDto.class);

            for (SectionDto section : sourceSections) {
                dsl.insertInto(SECTIONS)
                        .set(SECTIONS.ID, UUID.randomUUID())
                        .set(SECTIONS.CLASS_ID, newClassId)
                        .set(SECTIONS.NAME, section.name())
                        .set(SECTIONS.CAPACITY, section.capacity())
                        .execute();
            }
        }
    }
}
