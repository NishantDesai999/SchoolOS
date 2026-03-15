package com.schoolos.digest;

import java.time.LocalTime;
import java.util.UUID;

public record DigestSettingsDto(
        UUID schoolId,
        String ownerEmail,
        String ownerWhatsapp,
        LocalTime digestTime,
        String defaultLanguage
) {}
