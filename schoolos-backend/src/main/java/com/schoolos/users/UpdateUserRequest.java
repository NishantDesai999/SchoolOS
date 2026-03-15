package com.schoolos.users;

public record UpdateUserRequest(
        String name,
        String phone,
        String role,
        String preferredLanguage,
        Boolean isActive
) {}
