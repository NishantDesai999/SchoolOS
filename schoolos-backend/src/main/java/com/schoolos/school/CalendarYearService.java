package com.schoolos.school;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static com.schoolos.jooq.Tables.CALENDAR_YEARS;

@Service
public class CalendarYearService {

    private final DSLContext dsl;

    public CalendarYearService(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<CalendarYearDto> listYears() {
        UUID schoolId = TenantContext.get();
        return dsl.selectFrom(CALENDAR_YEARS)
                .where(CALENDAR_YEARS.SCHOOL_ID.eq(schoolId))
                .and(CALENDAR_YEARS.DELETED_AT.isNull())
                .orderBy(CALENDAR_YEARS.YEAR.desc())
                .fetchInto(CalendarYearDto.class);
    }

    @Transactional
    public CalendarYearDto create(CreateCalendarYearRequest req) {
        UUID schoolId = TenantContext.get();
        UUID id = UUID.randomUUID();

        if (req.isCurrent()) {
            dsl.update(CALENDAR_YEARS)
                    .set(CALENDAR_YEARS.IS_CURRENT, false)
                    .set(CALENDAR_YEARS.UPDATED_AT, OffsetDateTime.now())
                    .where(CALENDAR_YEARS.SCHOOL_ID.eq(schoolId))
                    .execute();
        }

        dsl.insertInto(CALENDAR_YEARS)
                .set(CALENDAR_YEARS.ID, id)
                .set(CALENDAR_YEARS.SCHOOL_ID, schoolId)
                .set(CALENDAR_YEARS.YEAR, req.year())
                .set(CALENDAR_YEARS.LABEL, req.label())
                .set(CALENDAR_YEARS.START_DATE, req.startDate())
                .set(CALENDAR_YEARS.END_DATE, req.endDate())
                .set(CALENDAR_YEARS.IS_CURRENT, req.isCurrent())
                .execute();

        return dsl.selectFrom(CALENDAR_YEARS)
                .where(CALENDAR_YEARS.ID.eq(id))
                .fetchOneInto(CalendarYearDto.class);
    }

    @Transactional
    public CalendarYearDto setCurrent(UUID id) {
        UUID schoolId = TenantContext.get();

        dsl.update(CALENDAR_YEARS)
                .set(CALENDAR_YEARS.IS_CURRENT, false)
                .set(CALENDAR_YEARS.UPDATED_AT, OffsetDateTime.now())
                .where(CALENDAR_YEARS.SCHOOL_ID.eq(schoolId))
                .execute();

        dsl.update(CALENDAR_YEARS)
                .set(CALENDAR_YEARS.IS_CURRENT, true)
                .set(CALENDAR_YEARS.UPDATED_AT, OffsetDateTime.now())
                .where(CALENDAR_YEARS.ID.eq(id))
                .and(CALENDAR_YEARS.SCHOOL_ID.eq(schoolId))
                .execute();

        return dsl.selectFrom(CALENDAR_YEARS)
                .where(CALENDAR_YEARS.ID.eq(id))
                .fetchOneInto(CalendarYearDto.class);
    }
}
