package com.schoolos.digest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static com.schoolos.jooq.Tables.DAILY_DIGEST_LOGS;
import static com.schoolos.jooq.Tables.SCHOOLS;

@Service
public class DigestService {

    private final DSLContext dsl;
    private final DigestBuilderService builderService;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    public DigestService(DSLContext dsl, DigestBuilderService builderService,
                          EmailService emailService, ObjectMapper objectMapper) {
        this.dsl = dsl;
        this.builderService = builderService;
        this.emailService = emailService;
        this.objectMapper = objectMapper;
    }

    public DigestSettingsDto getSettings() {
        UUID schoolId = TenantContext.get();
        return dsl.select(
                        SCHOOLS.ID.as("schoolId"),
                        SCHOOLS.OWNER_EMAIL.as("ownerEmail"),
                        SCHOOLS.OWNER_WHATSAPP.as("ownerWhatsapp"),
                        SCHOOLS.DIGEST_TIME.as("digestTime"),
                        SCHOOLS.DEFAULT_LANGUAGE.as("defaultLanguage"))
                .from(SCHOOLS)
                .where(SCHOOLS.ID.eq(schoolId))
                .and(SCHOOLS.DELETED_AT.isNull())
                .fetchOneInto(DigestSettingsDto.class);
    }

    public DigestSettingsDto updateSettings(UpdateDigestSettingsRequest req) {
        UUID schoolId = TenantContext.get();
        var update = dsl.update(SCHOOLS).set(SCHOOLS.UPDATED_AT, OffsetDateTime.now());
        if (req.ownerEmail() != null) update = update.set(SCHOOLS.OWNER_EMAIL, req.ownerEmail());
        if (req.ownerWhatsapp() != null) update = update.set(SCHOOLS.OWNER_WHATSAPP, req.ownerWhatsapp());
        if (req.digestTime() != null) {
            update = update.set(SCHOOLS.DIGEST_TIME, java.time.LocalTime.parse(req.digestTime()));
        }
        update.where(SCHOOLS.ID.eq(schoolId)).execute();
        return getSettings();
    }

    public DigestPreviewDto preview() {
        return builderService.buildForCurrentTenant();
    }

    public void sendNow() {
        UUID schoolId = TenantContext.get();
        sendDigestForSchool(schoolId);
    }

    public record DigestHistoryPage(List<DigestLogDto> data, long total) {}

    public DigestHistoryPage history(int page, int size) {
        UUID schoolId = TenantContext.get();

        long total = dsl.fetchCount(
                dsl.selectFrom(DAILY_DIGEST_LOGS)
                        .where(DAILY_DIGEST_LOGS.SCHOOL_ID.eq(schoolId))
                        .and(DAILY_DIGEST_LOGS.DELETED_AT.isNull())
        );
        List<DigestLogDto> data = dsl.selectFrom(DAILY_DIGEST_LOGS)
                .where(DAILY_DIGEST_LOGS.SCHOOL_ID.eq(schoolId))
                .and(DAILY_DIGEST_LOGS.DELETED_AT.isNull())
                .orderBy(DAILY_DIGEST_LOGS.CREATED_AT.desc())
                .limit(size).offset((long) page * size)
                .fetchInto(DigestLogDto.class);

        return new DigestHistoryPage(data, total);
    }

    public void sendDigestForSchool(UUID schoolId) {
        try {
            DigestPreviewDto preview = builderService.buildForSchool(schoolId);

            String content = buildEmailContent(preview);

            // Get school email
            String email = dsl.select(SCHOOLS.OWNER_EMAIL)
                    .from(SCHOOLS)
                    .where(SCHOOLS.ID.eq(schoolId))
                    .fetchOneInto(String.class);

            if (email != null && !email.isBlank()) {
                emailService.sendDigest(email, "SchoolOS Daily Digest - " + LocalDate.now(), content);
            }

            // Log the digest
            dsl.insertInto(DAILY_DIGEST_LOGS)
                    .set(DAILY_DIGEST_LOGS.ID, UUID.randomUUID())
                    .set(DAILY_DIGEST_LOGS.SCHOOL_ID, schoolId)
                    .set(DAILY_DIGEST_LOGS.DIGEST_DATE, LocalDate.now())
                    .set(DAILY_DIGEST_LOGS.CHANNEL, "EMAIL")
                    .set(DAILY_DIGEST_LOGS.LANGUAGE, "en")
                    .set(DAILY_DIGEST_LOGS.CONTENT, content)
                    .set(DAILY_DIGEST_LOGS.FEE_COLLECTED_TODAY, preview.feesCollectedToday())
                    .set(DAILY_DIGEST_LOGS.NEW_INQUIRIES, (int) preview.newAdmissionsThisWeek())
                    .set(DAILY_DIGEST_LOGS.STATUS, "SENT")
                    .set(DAILY_DIGEST_LOGS.SENT_AT, OffsetDateTime.now())
                    .execute();
        } catch (Exception e) {
            // Log failure
            dsl.insertInto(DAILY_DIGEST_LOGS)
                    .set(DAILY_DIGEST_LOGS.ID, UUID.randomUUID())
                    .set(DAILY_DIGEST_LOGS.SCHOOL_ID, schoolId)
                    .set(DAILY_DIGEST_LOGS.DIGEST_DATE, LocalDate.now())
                    .set(DAILY_DIGEST_LOGS.CHANNEL, "EMAIL")
                    .set(DAILY_DIGEST_LOGS.LANGUAGE, "en")
                    .set(DAILY_DIGEST_LOGS.CONTENT, "Failed: " + e.getMessage())
                    .set(DAILY_DIGEST_LOGS.STATUS, "FAILED")
                    .execute();
        }
    }

    private String buildEmailContent(DigestPreviewDto preview) {
        StringBuilder sb = new StringBuilder();
        sb.append("SchoolOS Daily Digest - ").append(preview.date()).append("\n\n");
        sb.append("Students: ").append(preview.activeStudents()).append(" active / ").append(preview.totalStudents()).append(" total\n");
        sb.append("Fees Collected Today: ₹").append(preview.feesCollectedToday()).append("\n");
        sb.append("Total Outstanding Dues: ₹").append(preview.totalDues()).append("\n");
        sb.append("New Admissions This Week: ").append(preview.newAdmissionsThisWeek()).append("\n");

        if (!preview.alerts().isEmpty()) {
            sb.append("\nAlerts:\n");
            for (String alert : preview.alerts()) {
                sb.append("• ").append(alert).append("\n");
            }
        }
        return sb.toString();
    }
}
