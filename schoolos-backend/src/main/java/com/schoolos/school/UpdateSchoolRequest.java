package com.schoolos.school;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateSchoolRequest(
        @Size(max = 200) String name,
        @Size(max = 50) String board,
        String address,
        @Size(max = 15) String phone,
        @Email @Size(max = 100) String email,
        @Size(max = 5) String defaultLanguage,
        @Size(max = 15) String ownerWhatsapp,
        @Email @Size(max = 100) String ownerEmail,
        String digestTime
) {}
