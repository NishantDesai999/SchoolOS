package com.schoolos.fee;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.FEE_BREAKDOWN_ITEMS;
import static com.schoolos.jooq.Tables.FEE_CONFIGS;

@Service
public class FeeConfigService {

    private final DSLContext dsl;

    public FeeConfigService(DSLContext dsl) {
        this.dsl = dsl;
    }

    private record FeeConfigRow(
            UUID id, UUID schoolId, Integer calendarYear, Integer gradeLevel,
            Boolean isActive, OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime deletedAt
    ) {}

    public List<FeeConfigDto> list(Integer yearId, Integer gradeLevel) {
        UUID schoolId = TenantContext.get();

        var query = dsl.selectFrom(FEE_CONFIGS)
                .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                .and(FEE_CONFIGS.DELETED_AT.isNull());

        if (yearId != null) {
            query = query.and(FEE_CONFIGS.CALENDAR_YEAR.eq(yearId));
        }
        if (gradeLevel != null) {
            query = query.and(FEE_CONFIGS.GRADE_LEVEL.eq(gradeLevel));
        }

        List<FeeConfigRow> rows = query
                .orderBy(FEE_CONFIGS.GRADE_LEVEL.asc())
                .fetchInto(FeeConfigRow.class);

        // Load items for each config
        return rows.stream().map(c -> {
            List<FeeBreakdownItemDto> items = dsl.selectFrom(FEE_BREAKDOWN_ITEMS)
                    .where(FEE_BREAKDOWN_ITEMS.FEE_CONFIG_ID.eq(c.id()))
                    .and(FEE_BREAKDOWN_ITEMS.DELETED_AT.isNull())
                    .orderBy(FEE_BREAKDOWN_ITEMS.DISPLAY_ORDER.asc())
                    .fetchInto(FeeBreakdownItemDto.class);
            return new FeeConfigDto(c.id(), c.schoolId(), c.calendarYear(), c.gradeLevel(),
                    c.isActive(), items, c.createdAt(), c.updatedAt(), c.deletedAt());
        }).toList();
    }

    @Transactional
    public FeeConfigDto upsert(UpsertFeeConfigRequest req) {
        UUID schoolId = TenantContext.get();

        // Check if config already exists
        UUID existing = dsl.select(FEE_CONFIGS.ID)
                .from(FEE_CONFIGS)
                .where(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                .and(FEE_CONFIGS.CALENDAR_YEAR.eq(req.calendarYear()))
                .and(FEE_CONFIGS.GRADE_LEVEL.eq(req.gradeLevel()))
                .and(FEE_CONFIGS.DELETED_AT.isNull())
                .fetchOneInto(UUID.class);

        UUID configId;
        if (existing != null) {
            configId = existing;
            dsl.update(FEE_CONFIGS)
                    .set(FEE_CONFIGS.IS_ACTIVE, req.isActive() != null ? req.isActive() : true)
                    .set(FEE_CONFIGS.UPDATED_AT, OffsetDateTime.now())
                    .where(FEE_CONFIGS.ID.eq(configId))
                    .execute();

            // Delete existing items
            dsl.update(FEE_BREAKDOWN_ITEMS)
                    .set(FEE_BREAKDOWN_ITEMS.DELETED_AT, OffsetDateTime.now())
                    .where(FEE_BREAKDOWN_ITEMS.FEE_CONFIG_ID.eq(configId))
                    .execute();
        } else {
            configId = UUID.randomUUID();
            dsl.insertInto(FEE_CONFIGS)
                    .set(FEE_CONFIGS.ID, configId)
                    .set(FEE_CONFIGS.SCHOOL_ID, schoolId)
                    .set(FEE_CONFIGS.CALENDAR_YEAR, req.calendarYear())
                    .set(FEE_CONFIGS.GRADE_LEVEL, req.gradeLevel())
                    .set(FEE_CONFIGS.IS_ACTIVE, req.isActive() != null ? req.isActive() : true)
                    .execute();
        }

        // Insert items
        if (req.items() != null) {
            for (var item : req.items()) {
                dsl.insertInto(FEE_BREAKDOWN_ITEMS)
                        .set(FEE_BREAKDOWN_ITEMS.ID, UUID.randomUUID())
                        .set(FEE_BREAKDOWN_ITEMS.FEE_CONFIG_ID, configId)
                        .set(FEE_BREAKDOWN_ITEMS.TYPE, item.type())
                        .set(FEE_BREAKDOWN_ITEMS.VALUE, item.value())
                        .set(FEE_BREAKDOWN_ITEMS.FREQUENCY, item.frequency() != null ? item.frequency() : "ANNUAL")
                        .set(FEE_BREAKDOWN_ITEMS.IS_MANDATORY, item.isMandatory() != null ? item.isMandatory() : true)
                        .set(FEE_BREAKDOWN_ITEMS.IS_RECURRING, item.isRecurring() != null ? item.isRecurring() : true)
                        .set(FEE_BREAKDOWN_ITEMS.GST_APPLICABLE, item.gstApplicable() != null ? item.gstApplicable() : false)
                        .set(FEE_BREAKDOWN_ITEMS.GST_RATE, item.gstRate() != null ? item.gstRate() : java.math.BigDecimal.ZERO)
                        .set(FEE_BREAKDOWN_ITEMS.DISPLAY_ORDER, item.displayOrder() != null ? item.displayOrder() : 0)
                        .execute();
            }
        }

        final UUID finalConfigId = configId;
        return list(req.calendarYear(), req.gradeLevel()).stream()
                .filter(c -> c.id().equals(finalConfigId))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Config not found"));
    }

    public void delete(UUID id) {
        UUID schoolId = TenantContext.get();
        dsl.update(FEE_CONFIGS)
                .set(FEE_CONFIGS.DELETED_AT, OffsetDateTime.now())
                .where(FEE_CONFIGS.ID.eq(id))
                .and(FEE_CONFIGS.SCHOOL_ID.eq(schoolId))
                .execute();
    }
}
