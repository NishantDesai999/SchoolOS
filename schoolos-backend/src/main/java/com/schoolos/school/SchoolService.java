package com.schoolos.school;

import com.schoolos.common.StorageService;
import com.schoolos.common.TenantContext;
import com.schoolos.common.UrlResult;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.UUID;

import static com.schoolos.jooq.Tables.SCHOOLS;

@Service
public class SchoolService {

    private final DSLContext dsl;
    private final StorageService storageService;

    public SchoolService(DSLContext dsl, StorageService storageService) {
        this.dsl = dsl;
        this.storageService = storageService;
    }

    public SchoolDto getMySchool() {
        UUID schoolId = TenantContext.get();
        return dsl.selectFrom(SCHOOLS)
                .where(SCHOOLS.ID.eq(schoolId))
                .and(SCHOOLS.DELETED_AT.isNull())
                .fetchOneInto(SchoolDto.class);
    }

    public SchoolDto updateSchool(UpdateSchoolRequest req) {
        UUID schoolId = TenantContext.get();

        var update = dsl.update(SCHOOLS)
                .set(SCHOOLS.UPDATED_AT, OffsetDateTime.now());

        if (req.name() != null) update = update.set(SCHOOLS.NAME, req.name());
        if (req.board() != null) update = update.set(SCHOOLS.BOARD, req.board());
        if (req.address() != null) update = update.set(SCHOOLS.ADDRESS, req.address());
        if (req.phone() != null) update = update.set(SCHOOLS.PHONE, req.phone());
        if (req.email() != null) update = update.set(SCHOOLS.EMAIL, req.email());
        if (req.defaultLanguage() != null) update = update.set(SCHOOLS.DEFAULT_LANGUAGE, req.defaultLanguage());
        if (req.ownerWhatsapp() != null) update = update.set(SCHOOLS.OWNER_WHATSAPP, req.ownerWhatsapp());
        if (req.ownerEmail() != null) update = update.set(SCHOOLS.OWNER_EMAIL, req.ownerEmail());
        if (req.digestTime() != null) {
            update = update.set(SCHOOLS.DIGEST_TIME,
                    org.jooq.impl.DSL.field("?::time", org.jooq.impl.DSL.val(req.digestTime())));
        }

        update.where(SCHOOLS.ID.eq(schoolId)).execute();
        return getMySchool();
    }

    public UrlResult uploadLogo(MultipartFile file) {
        UUID schoolId = TenantContext.get();
        String url = storageService.store(file, "logos");
        dsl.update(SCHOOLS)
                .set(SCHOOLS.LOGO_URL, url)
                .set(SCHOOLS.UPDATED_AT, OffsetDateTime.now())
                .where(SCHOOLS.ID.eq(schoolId))
                .execute();
        return UrlResult.of(url);
    }

    public UrlResult uploadSignature(MultipartFile file) {
        UUID schoolId = TenantContext.get();
        String url = storageService.store(file, "signatures");
        dsl.update(SCHOOLS)
                .set(SCHOOLS.PRINCIPAL_SIGNATURE_URL, url)
                .set(SCHOOLS.UPDATED_AT, OffsetDateTime.now())
                .where(SCHOOLS.ID.eq(schoolId))
                .execute();
        return UrlResult.of(url);
    }
}
