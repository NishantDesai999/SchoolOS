package com.schoolos.dashboard;

import com.schoolos.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@PreAuthorize("hasAnyRole('admin', 'principal', 'trustee')")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public ApiResponse<DashboardStats> getStats() {
        return ApiResponse.ok(dashboardService.getStats());
    }

    @GetMapping("/monthly-fees")
    public ApiResponse<List<DashboardService.MonthlyFee>> getMonthlyFees(
            @RequestParam(defaultValue = "0") int year) {
        int y = year > 0 ? year : java.time.LocalDate.now().getYear();
        return ApiResponse.ok(dashboardService.getMonthlyFees(y));
    }
}
