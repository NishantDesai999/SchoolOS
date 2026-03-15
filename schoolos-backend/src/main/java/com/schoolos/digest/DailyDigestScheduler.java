package com.schoolos.digest;

import org.jooq.DSLContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static com.schoolos.jooq.Tables.SCHOOLS;

@Component
public class DailyDigestScheduler {

    private static final Logger log = LoggerFactory.getLogger(DailyDigestScheduler.class);

    private final DSLContext dsl;
    private final DigestService digestService;

    public DailyDigestScheduler(DSLContext dsl, DigestService digestService) {
        this.dsl = dsl;
        this.digestService = digestService;
    }

    @Scheduled(cron = "0 * * * * *")  // Every minute
    public void checkAndSendDigests() {
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        String currentTimeStr = String.format("%02d:%02d", now.getHour(), now.getMinute());

        log.debug("Checking digest schedules at {}", currentTimeStr);

        // Find all schools whose digest_time matches current time
        List<UUID> schoolIds = dsl.select(SCHOOLS.ID)
                .from(SCHOOLS)
                .where(SCHOOLS.DELETED_AT.isNull())
                .and(SCHOOLS.DIGEST_TIME.isNotNull())
                .fetchInto(UUID.class);

        for (UUID schoolId : schoolIds) {
            try {
                // Get school digest_time as LocalTime and compare
                LocalTime digestTime = dsl.select(SCHOOLS.DIGEST_TIME)
                        .from(SCHOOLS)
                        .where(SCHOOLS.ID.eq(schoolId))
                        .fetchOneInto(LocalTime.class);

                if (digestTime != null) {
                    LocalTime digestTimeNormalized = digestTime.withSecond(0).withNano(0);
                    if (digestTimeNormalized.equals(now)) {
                        log.info("Sending digest for school {}", schoolId);
                        digestService.sendDigestForSchool(schoolId);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to send digest for school {}: {}", schoolId, e.getMessage());
            }
        }
    }
}
