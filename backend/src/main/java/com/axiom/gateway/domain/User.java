package com.axiom.gateway.domain;
import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")

public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    public enum Role {
        USER,
        ADMIN
    }

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }
}
