package com.schoolos.users;

import com.schoolos.common.TenantContext;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.schoolos.jooq.Tables.USERS;

@Service
public class UserService {

    private final DSLContext dsl;
    private final KeycloakUserService keycloakUserService;

    public UserService(DSLContext dsl, KeycloakUserService keycloakUserService) {
        this.dsl = dsl;
        this.keycloakUserService = keycloakUserService;
    }

    public record UserPage(List<UserDto> data, long total) {}

    public UserPage list(int page, int size) {
        UUID schoolId = TenantContext.get();

        long total = dsl.fetchCount(
                dsl.selectFrom(USERS)
                        .where(USERS.SCHOOL_ID.eq(schoolId))
                        .and(USERS.DELETED_AT.isNull())
        );
        List<UserDto> data = dsl.selectFrom(USERS)
                .where(USERS.SCHOOL_ID.eq(schoolId))
                .and(USERS.DELETED_AT.isNull())
                .orderBy(USERS.NAME.asc())
                .limit(size).offset((long) page * size)
                .fetchInto(UserDto.class);

        return new UserPage(data, total);
    }

    @Transactional
    public UserDto create(CreateUserRequest req) {
        UUID schoolId = TenantContext.get();

        // Create in Keycloak
        String keycloakId = keycloakUserService.createUser(
                req.email(), req.name(), req.role(), req.temporaryPassword()
        );

        UUID userId = UUID.fromString(keycloakId);

        dsl.insertInto(USERS)
                .set(USERS.ID, userId)
                .set(USERS.SCHOOL_ID, schoolId)
                .set(USERS.EMAIL, req.email())
                .set(USERS.PHONE, req.phone())
                .set(USERS.ROLE, req.role())
                .set(USERS.NAME, req.name())
                .set(USERS.PREFERRED_LANGUAGE, req.preferredLanguage())
                .set(USERS.IS_ACTIVE, true)
                .set(USERS.KEYCLOAK_SYNCED_AT, OffsetDateTime.now())
                .execute();

        return getById(userId);
    }

    public UserDto getById(UUID id) {
        UUID schoolId = TenantContext.get();
        UserDto user = dsl.selectFrom(USERS)
                .where(USERS.ID.eq(id))
                .and(USERS.SCHOOL_ID.eq(schoolId))
                .and(USERS.DELETED_AT.isNull())
                .fetchOneInto(UserDto.class);
        if (user == null) throw new NoSuchElementException("User not found");
        return user;
    }

    public UserDto update(UUID id, UpdateUserRequest req) {
        UUID schoolId = TenantContext.get();
        var update = dsl.update(USERS).set(USERS.UPDATED_AT, OffsetDateTime.now());
        if (req.name() != null) update = update.set(USERS.NAME, req.name());
        if (req.phone() != null) update = update.set(USERS.PHONE, req.phone());
        if (req.role() != null) update = update.set(USERS.ROLE, req.role());
        if (req.preferredLanguage() != null) update = update.set(USERS.PREFERRED_LANGUAGE, req.preferredLanguage());
        if (req.isActive() != null) update = update.set(USERS.IS_ACTIVE, req.isActive());
        update.where(USERS.ID.eq(id)).and(USERS.SCHOOL_ID.eq(schoolId)).execute();

        // Update in Keycloak if name or role changed
        if (req.name() != null || req.role() != null) {
            UserDto user = getById(id);
            keycloakUserService.updateUser(id.toString(), user.name(), user.role());
        }

        return getById(id);
    }

    @Transactional
    public void delete(UUID id) {
        UUID schoolId = TenantContext.get();
        dsl.update(USERS)
                .set(USERS.DELETED_AT, OffsetDateTime.now())
                .set(USERS.IS_ACTIVE, false)
                .where(USERS.ID.eq(id))
                .and(USERS.SCHOOL_ID.eq(schoolId))
                .execute();

        // Disable in Keycloak
        keycloakUserService.disableUser(id.toString());
    }
}
