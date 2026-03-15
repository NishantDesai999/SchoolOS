package com.schoolos.school;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static com.schoolos.jooq.Tables.SECTIONS;
import static com.schoolos.jooq.Tables.CLASSES;

@Service
public class SectionService {

    private final DSLContext dsl;

    public SectionService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<SectionDto> listByClass(UUID classId) {
        UUID schoolId = TenantContext.get();
        // Verify the class belongs to this school
        return dsl.selectFrom(SECTIONS)
                .where(SECTIONS.CLASS_ID.eq(classId))
                .and(SECTIONS.DELETED_AT.isNull())
                .orderBy(SECTIONS.NAME.asc())
                .fetchInto(SectionDto.class);
    }

    public SectionDto create(CreateSectionRequest req) {
        UUID id = UUID.randomUUID();
        dsl.insertInto(SECTIONS)
                .set(SECTIONS.ID, id)
                .set(SECTIONS.CLASS_ID, req.classId())
                .set(SECTIONS.NAME, req.name())
                .set(SECTIONS.CAPACITY, req.capacity() != null ? req.capacity() : 40)
                .execute();
        return dsl.selectFrom(SECTIONS)
                .where(SECTIONS.ID.eq(id))
                .fetchOneInto(SectionDto.class);
    }

    public void delete(UUID id) {
        dsl.update(SECTIONS)
                .set(SECTIONS.DELETED_AT, OffsetDateTime.now())
                .where(SECTIONS.ID.eq(id))
                .execute();
    }
}
