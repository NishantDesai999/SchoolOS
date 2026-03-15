package com.schoolos.student;

import java.time.LocalDate;

public record UpdateStudentRequest(
        String firstName,
        String lastName,
        LocalDate dateOfBirth,
        String gender,
        String bloodGroup,
        String aadhaarNumber,
        String category,
        Boolean isRte
) {}
