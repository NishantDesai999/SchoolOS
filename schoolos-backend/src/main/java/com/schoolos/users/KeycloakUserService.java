package com.schoolos.users;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class KeycloakUserService {

    private static final Logger log = LoggerFactory.getLogger(KeycloakUserService.class);

    @Value("${app.keycloak.server-url:http://localhost:8080}")
    private String keycloakServerUrl;

    @Value("${app.keycloak.realm:schoolos}")
    private String realm;

    @Value("${app.keycloak.admin-client-id:schoolos-backend}")
    private String adminClientId;

    @Value("${app.keycloak.admin-client-secret:schoolos-backend-secret}")
    private String adminClientSecret;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String getAdminToken() {
        String tokenUrl = keycloakServerUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", adminClientId);
        body.add("client_secret", adminClientSecret);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, request, Map.class);
            if (response.getBody() != null) {
                return (String) response.getBody().get("access_token");
            }
        } catch (Exception e) {
            log.error("Failed to get Keycloak admin token: {}", e.getMessage());
        }
        return null;
    }

    public String createUser(String email, String name, String role, String temporaryPassword) {
        String token = getAdminToken();
        if (token == null) {
            log.warn("Keycloak unavailable - user created in DB only");
            return UUID.randomUUID().toString();
        }

        String usersUrl = keycloakServerUrl + "/admin/realms/" + realm + "/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        String[] nameParts = name.split(" ", 2);
        Map<String, Object> userRepresentation = Map.of(
                "username", email,
                "email", email,
                "firstName", nameParts[0],
                "lastName", nameParts.length > 1 ? nameParts[1] : "",
                "enabled", true,
                "emailVerified", true,
                "credentials", List.of(Map.of(
                        "type", "password",
                        "value", temporaryPassword != null ? temporaryPassword : "SchoolOS@123",
                        "temporary", true
                )),
                "realmRoles", List.of(role)
        );

        try {
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(userRepresentation, headers);
            ResponseEntity<Void> response = restTemplate.postForEntity(usersUrl, request, Void.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // Get the created user's ID from Location header
                String location = response.getHeaders().getFirst("Location");
                if (location != null) {
                    return location.substring(location.lastIndexOf('/') + 1);
                }
            }
        } catch (Exception e) {
            log.error("Failed to create user in Keycloak: {}", e.getMessage());
        }

        return UUID.randomUUID().toString();
    }

    public void disableUser(String keycloakUserId) {
        String token = getAdminToken();
        if (token == null) return;

        String userUrl = keycloakServerUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> update = Map.of("enabled", false);

        try {
            restTemplate.exchange(userUrl, HttpMethod.PUT, new HttpEntity<>(update, headers), Void.class);
        } catch (Exception e) {
            log.error("Failed to disable user in Keycloak: {}", e.getMessage());
        }
    }

    public void updateUser(String keycloakUserId, String name, String role) {
        String token = getAdminToken();
        if (token == null) return;

        String userUrl = keycloakServerUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        String[] nameParts = name != null ? name.split(" ", 2) : new String[]{"", ""};
        Map<String, Object> update = Map.of(
                "firstName", nameParts[0],
                "lastName", nameParts.length > 1 ? nameParts[1] : ""
        );

        try {
            restTemplate.exchange(userUrl, HttpMethod.PUT, new HttpEntity<>(update, headers), Void.class);
        } catch (Exception e) {
            log.error("Failed to update user in Keycloak: {}", e.getMessage());
        }
    }
}
