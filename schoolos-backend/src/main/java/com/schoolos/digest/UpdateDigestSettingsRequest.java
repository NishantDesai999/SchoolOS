package com.schoolos.digest;

public record UpdateDigestSettingsRequest(
        String ownerEmail,
        String ownerWhatsapp,
        String digestTime
) {}
