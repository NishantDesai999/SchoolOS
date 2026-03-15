package com.schoolos.users;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateUserRequest(
        @NotBlank String name,
        @Email @NotBlank String email,
        String phone,
        @NotBlank String role,
        String preferredLanguage,
        String temporaryPassword
) {}
