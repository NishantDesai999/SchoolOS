package com.schoolos.school;

import com.schoolos.common.ApiResponse;
import java.util.List;
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


    @GetMapping
    @PreAuthorize("hasRole('admin')")
    public ApiResponse<List<SchoolDto>> listAll() {
        return ApiResponse.ok(schoolService.listAll());
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('admin', 'principal', 'trustee')")
    public ApiResponse<SchoolDto> getMySchool() {
        return ApiResponse.ok(schoolService.getMySchool());
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<SchoolDto> updateSchool(@Valid @RequestBody UpdateSchoolRequest req) {
        return ApiResponse.ok(schoolService.updateSchool(req));
    }

    @PostMapping("/me/logo")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<UrlResult> uploadLogo(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(schoolService.uploadLogo(file));
    }

    @PostMapping("/me/signature")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<UrlResult> uploadSignature(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(schoolService.uploadSignature(file));
    }
}
