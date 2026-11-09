package com.axiom.gateway.domain;
import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.UUID;


@Entity
@Table(name = "profiles")
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "elo_rating", nullable = false)
    private Integer eloRating = 1200;

    @Column(name = "matches_played", nullable = false)
    private Integer matchesPlayed = 0;

    @Column(name = "win_rate", nullable = false)
    private Double winRate = 0.0;

    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
}