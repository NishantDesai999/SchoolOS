package com.schoolos.student;

import com.schoolos.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admissions")
public class AdmissionController {

    private final AdmissionService admissionService;

    public AdmissionController(AdmissionService admissionService) {
        this.admissionService = admissionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<List<AdmissionDto>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = admissionService.list(search, status, page, size);
        return ApiResponse.paged(result.data(), result.total(), page, size);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<AdmissionDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(admissionService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<AdmissionDto> updateStatus(@PathVariable UUID id,
                                                   @RequestParam String status) {
        return ApiResponse.ok(admissionService.updateStatus(id, status));
    }

    @PostMapping("/{id}/convert")
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<StudentDto> convert(@PathVariable UUID id) {
        return ApiResponse.ok(admissionService.convertToStudent(id));
    }
}
