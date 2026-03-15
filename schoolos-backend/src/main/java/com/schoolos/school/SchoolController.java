package com.schoolos.school;

import com.schoolos.common.ApiResponse;
import com.schoolos.common.UrlResult;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/schools")
public class SchoolController {

    private final SchoolService schoolService;

    public SchoolController(SchoolService schoolService) {
        this.schoolService = schoolService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'PARENT')")
    public ApiResponse<SchoolDto> getMySchool() {
        return ApiResponse.ok(schoolService.getMySchool());
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<SchoolDto> updateSchool(@Valid @RequestBody UpdateSchoolRequest req) {
        return ApiResponse.ok(schoolService.updateSchool(req));
    }

    @PostMapping("/me/logo")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UrlResult> uploadLogo(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(schoolService.uploadLogo(file));
    }

    @PostMapping("/me/signature")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UrlResult> uploadSignature(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(schoolService.uploadSignature(file));
    }
}
