package com.schoolos.users;

public enum AppRole {
    ADMIN("admin", "Admin"),
    PRINCIPAL("principal", "Principal"),
    TEACHER("teacher", "Teacher"),
    TRUSTEE("trustee", "Trustee");

    public final String value;
    public final String displayName;

    AppRole(String value, String displayName) {
        this.value = value;
        this.displayName = displayName;
    }

    public static AppRole fromValue(String value) {
        for (AppRole r : values()) {
            if (r.value.equalsIgnoreCase(value)) return r;
        }
        throw new IllegalArgumentException("Unknown role: " + value);
    }
}
