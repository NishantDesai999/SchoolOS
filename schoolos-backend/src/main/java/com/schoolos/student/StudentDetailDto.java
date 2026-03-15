package com.schoolos.student;

import java.util.List;

public record StudentDetailDto(
        StudentDto student,
        List<EnrollmentDto> enrollments,
        List<GuardianDto> guardians
) {}
