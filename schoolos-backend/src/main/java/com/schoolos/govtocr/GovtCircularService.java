package com.schoolos.govtocr;

import com.schoolos.common.StorageService;
import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.GOVT_CIRCULARS;

@Service
public class GovtCircularService {

    private final DSLContext dsl;
    private final StorageService storageService;
    private final CircularOcrService ocrService;

    public GovtCircularService(DSLContext dsl, StorageService storageService, CircularOcrService ocrService) {
        this.dsl = dsl;
        this.storageService = storageService;
        this.ocrService = ocrService;
    }

    public record CircularPage(List<GovtCircularDto> data, long total) {}

    public CircularPage list(int page, int size) {
        UUID schoolId = TenantContext.get();

        long total = dsl.fetchCount(
                dsl.selectFrom(GOVT_CIRCULARS)
                        .where(GOVT_CIRCULARS.SCHOOL_ID.eq(schoolId))
                        .and(GOVT_CIRCULARS.DELETED_AT.isNull())
        );
        List<GovtCircularDto> data = dsl.selectFrom(GOVT_CIRCULARS)
                .where(GOVT_CIRCULARS.SCHOOL_ID.eq(schoolId))
                .and(GOVT_CIRCULARS.DELETED_AT.isNull())
                .orderBy(GOVT_CIRCULARS.UPLOADED_AT.desc())
                .limit(size).offset((long) page * size)
                .fetchInto(GovtCircularDto.class);

        return new CircularPage(data, total);
    }

    public GovtCircularDto upload(MultipartFile file) {
        UUID schoolId = TenantContext.get();
        UUID id = UUID.randomUUID();

        String fileUrl = storageService.store(file, "circulars");
        int year = java.time.LocalDate.now().getYear();

        dsl.insertInto(GOVT_CIRCULARS)
                .set(GOVT_CIRCULARS.ID, id)
                .set(GOVT_CIRCULARS.SCHOOL_ID, schoolId)
                .set(GOVT_CIRCULARS.CALENDAR_YEAR, year)
                .set(GOVT_CIRCULARS.FILE_URL, fileUrl)
                .set(GOVT_CIRCULARS.OCR_STATUS, "PENDING")
                .set(GOVT_CIRCULARS.OCR_EXTRACTED_DATA, JSONB.valueOf("{}"))
                .execute();

        // Perform OCR asynchronously (simplified - doing synchronously here)
        try {
            byte[] fileBytes = file.getBytes();
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/png";
            CircularOcrService.OcrResult ocrResult = ocrService.extractText(fileBytes, mimeType);

            dsl.update(GOVT_CIRCULARS)
                    .set(GOVT_CIRCULARS.OCR_STATUS, ocrResult.status())
                    .set(GOVT_CIRCULARS.OCR_EXTRACTED_DATA, JSONB.valueOf(ocrResult.extractedDataJson()))
                    .set(GOVT_CIRCULARS.OCR_CONFIDENCE, BigDecimal.valueOf(ocrResult.confidence()))
                    .set(GOVT_CIRCULARS.UPDATED_AT, OffsetDateTime.now())
                    .where(GOVT_CIRCULARS.ID.eq(id))
                    .execute();
        } catch (Exception e) {
            dsl.update(GOVT_CIRCULARS)
                    .set(GOVT_CIRCULARS.OCR_STATUS, "FAILED")
                    .set(GOVT_CIRCULARS.UPDATED_AT, OffsetDateTime.now())
                    .where(GOVT_CIRCULARS.ID.eq(id))
                    .execute();
        }

        return getById(id);
    }

    public GovtCircularDto getById(UUID id) {
        UUID schoolId = TenantContext.get();
        GovtCircularDto circular = dsl.selectFrom(GOVT_CIRCULARS)
                .where(GOVT_CIRCULARS.ID.eq(id))
                .and(GOVT_CIRCULARS.SCHOOL_ID.eq(schoolId))
                .and(GOVT_CIRCULARS.DELETED_AT.isNull())
                .fetchOneInto(GovtCircularDto.class);
        if (circular == null) throw new NoSuchElementException("Circular not found");
        return circular;
    }
}
