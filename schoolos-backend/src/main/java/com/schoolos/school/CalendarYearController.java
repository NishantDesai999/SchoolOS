package com.schoolos.school;

import com.schoolos.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calendar-years")
@PreAuthorize("hasAnyRole('admin', 'principal')")
public class CalendarYearController {

    private final CalendarYearService calendarYearService;

    public CalendarYearController(CalendarYearService calendarYearService) {
        this.calendarYearService = calendarYearService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('admin', 'principal')")
    public ApiResponse<List<CalendarYearDto>> list() {
        return ApiResponse.ok(calendarYearService.listYears());
    }

    @PostMapping
    public ApiResponse<CalendarYearDto> create(@Valid @RequestBody CreateCalendarYearRequest req) {
        return ApiResponse.ok(calendarYearService.create(req));
    }

    @PutMapping("/{id}/set-current")
    public ApiResponse<CalendarYearDto> setCurrent(@PathVariable UUID id) {
        return ApiResponse.ok(calendarYearService.setCurrent(id));
    }
}
