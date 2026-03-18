package com.schoolos.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class TenantFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                String jwtSchoolId = jwt.getClaimAsString("school_id");
                String headerSchoolId = request.getHeader("X-School-Id");

                boolean isAdmin = auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_admin"));

                UUID resolved = null;

                if (headerSchoolId != null && !headerSchoolId.isBlank()) {
                    // Admins can switch to any school via header; others must match their JWT school
                    if (isAdmin || headerSchoolId.equals(jwtSchoolId)) {
                        try { resolved = UUID.fromString(headerSchoolId); } catch (IllegalArgumentException ignored) {}
                    }
                }

                if (resolved == null && jwtSchoolId != null && !jwtSchoolId.isBlank()) {
                    try { resolved = UUID.fromString(jwtSchoolId); } catch (IllegalArgumentException ignored) {}
                }

                if (resolved != null) TenantContext.set(resolved);
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
