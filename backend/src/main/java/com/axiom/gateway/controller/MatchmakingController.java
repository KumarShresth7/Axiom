package com.axiom.gateway.controller;

import com.axiom.gateway.domain.Profile;
import com.axiom.gateway.domain.User;
import com.axiom.gateway.repository.ProfileRepository;
import com.axiom.gateway.repository.UserRepository;
import com.axiom.gateway.service.MatchmakingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/match")
public class MatchmakingController {

    private final MatchmakingService matchmakingService;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;

    public MatchmakingController(MatchmakingService matchmakingService,
                                 UserRepository userRepository,
                                 ProfileRepository profileRepository) {
        this.matchmakingService = matchmakingService;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
    }

    @PostMapping("/join")
    public ResponseEntity<String> joinQueue(Authentication authentication) {
        // The JWT filter populates the Authentication object with the email
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Fetching profile by custom query or filtering. For the prototype,
        // you might need to add Optional<Profile> findByUser(User user); to ProfileRepository
        Profile profile = profileRepository.findAll().stream()
                .filter(p -> p.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        matchmakingService.joinQueue(email, profile.getEloRating());
        return ResponseEntity.ok("Joined matchmaking queue");
    }
}