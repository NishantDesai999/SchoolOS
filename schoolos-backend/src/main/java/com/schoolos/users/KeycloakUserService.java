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

    @Value("${app.keycloak.server-url:http://localhost:8180}")
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
                ))
        );

        try {
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(userRepresentation, headers);
            ResponseEntity<Void> response = restTemplate.postForEntity(usersUrl, request, Void.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                String location = response.getHeaders().getFirst("Location");
                if (location != null) {
                    String userId = location.substring(location.lastIndexOf('/') + 1);
                    // Assign realm role separately (Keycloak ignores realmRoles in user body)
                    assignRealmRole(token, userId, role);
                    return userId;
                }
            }
        } catch (Exception e) {
            log.error("Failed to create user in Keycloak: {}", e.getMessage());
        }

        return UUID.randomUUID().toString();
    }

    private void assignRealmRole(String token, String userId, String roleName) {
        try {
            String roleUrl = keycloakServerUrl + "/admin/realms/" + realm + "/roles/" + roleName;
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);

            ResponseEntity<Map> roleResp = restTemplate.exchange(roleUrl, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (roleResp.getBody() == null) {
                log.warn("Role not found in Keycloak: {}", roleName);
                return;
            }

            String roleMappingUrl = keycloakServerUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm";
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(roleMappingUrl, new HttpEntity<>(List.of(roleResp.getBody()), headers), Void.class);
            log.info("Assigned role '{}' to user {}", roleName, userId);
        } catch (Exception e) {
            log.error("Failed to assign role '{}' to user {}: {}", roleName, userId, e.getMessage());
        }
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
