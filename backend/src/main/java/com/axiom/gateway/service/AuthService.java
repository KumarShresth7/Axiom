package com.axiom.gateway.service;

import com.axiom.gateway.domain.Profile;
import com.axiom.gateway.domain.User;
import com.axiom.gateway.dto.AuthResponse;
import com.axiom.gateway.dto.LoginRequest;
import com.axiom.gateway.dto.RegisterRequest;
import com.axiom.gateway.repository.ProfileRepository;
import com.axiom.gateway.repository.UserRepository;
import com.axiom.gateway.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;



@Service
public class AuthService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       ProfileRepository profileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email is already registered");
        }
        if (profileRepository.findByUsername(request.username()).isPresent()) {
            throw new IllegalArgumentException("Username is already taken");
        }

        // 1. Create and save the User credentials
        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(User.Role.USER);
        user = userRepository.save(user);

        // 2. Initialize and save the public Profile
        Profile profile = new Profile();
        profile.setUser(user);
        profile.setUsername(request.username());
        profileRepository.save(profile);

        // 3. Generate and return the JWT
        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponse(token);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponse(token);
    }
}