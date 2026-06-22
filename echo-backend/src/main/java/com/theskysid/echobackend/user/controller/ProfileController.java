package com.theskysid.echobackend.user.controller;

import com.theskysid.echobackend.auth.dto.OtpVerifyDTO;
import com.theskysid.echobackend.auth.dto.GoogleAuthDTO;
import com.theskysid.echobackend.auth.dto.request.OtpRequestDTO;
import com.theskysid.echobackend.auth.otp.entity.OtpVerification.IdentifierType;
import com.theskysid.echobackend.auth.service.EmailOtpService;
import com.theskysid.echobackend.auth.service.OtpService;
import com.theskysid.echobackend.auth.service.SmsOtpService;
import com.theskysid.echobackend.user.dto.ProfileUpdateDTO;
import com.theskysid.echobackend.user.dto.UserDTO;
import com.theskysid.echobackend.user.entity.AuthProvider;
import com.theskysid.echobackend.user.entity.User;
import com.theskysid.echobackend.user.repository.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailOtpService emailOtpService;

    @Autowired
    private SmsOtpService smsOtpService;

    @Autowired
    private OtpService otpService;

    @Value("${google.client-id}")
    private String googleClientId;

    private GoogleIdTokenVerifier verifier;

    @PostConstruct
    public void init() {
        verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    /**
     * GET /api/profile — get current user's profile
     */
    @GetMapping
    public ResponseEntity<?> getProfile(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(toDTO(user));
    }

    /**
     * PUT /api/profile — update displayName, bio, username
     */
    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody ProfileUpdateDTO request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName().trim());
        }
        if (request.getBio() != null) {
            String bio = request.getBio().trim();
            if (bio.length() > 200) bio = bio.substring(0, 200);
            user.setBio(bio);
        }
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            String newUsername = request.getUsername().trim();
            if (!newUsername.equals(user.getUsername())) {
                if (userRepository.findByUsername(newUsername).isPresent()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));
                }
                user.setUsername(newUsername);
            }
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(toDTO(saved));
    }

    /**
     * POST /api/profile/link-email/send — send OTP to email for linking
     */
    @PostMapping("/link-email/send")
    public ResponseEntity<?> sendLinkEmailOtp(@RequestBody OtpRequestDTO request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        try {
            // Check if this email is already used by another user
            User currentUser = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
                if (!existing.getId().equals(currentUser.getId())) {
                    throw new RuntimeException("This email is already linked to another account");
                }
            });
            emailOtpService.sendOtp(request.getEmail());
            return ResponseEntity.ok(Map.of("message", "OTP sent to " + request.getEmail()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/profile/link-email/verify — verify OTP and link email
     */
    @PostMapping("/link-email/verify")
    public ResponseEntity<?> verifyLinkEmail(@RequestBody OtpVerifyDTO request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        try {
            otpService.verifyOtp(request.getEmail(), IdentifierType.EMAIL, request.getOtp());
            User user = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Remove email from any auto-created OTP account
            userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    existing.setEmail(null);
                    userRepository.save(existing);
                }
            });

            user.setEmail(request.getEmail());
            User saved = userRepository.save(user);
            return ResponseEntity.ok(toDTO(saved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/profile/link-phone/send — send OTP to phone for linking
     */
    @PostMapping("/link-phone/send")
    public ResponseEntity<?> sendLinkPhoneOtp(@RequestBody OtpRequestDTO request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        try {
            User currentUser = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            userRepository.findByPhone(request.getPhone()).ifPresent(existing -> {
                if (!existing.getId().equals(currentUser.getId())) {
                    throw new RuntimeException("This phone is already linked to another account");
                }
            });
            smsOtpService.sendOtp(request.getPhone());
            return ResponseEntity.ok(Map.of("message", "OTP sent to " + request.getPhone()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/profile/link-phone/verify — verify OTP and link phone
     */
    @PostMapping("/link-phone/verify")
    public ResponseEntity<?> verifyLinkPhone(@RequestBody OtpVerifyDTO request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        try {
            otpService.verifyOtp(request.getPhone(), IdentifierType.PHONE, request.getOtp());
            User user = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Remove phone from any auto-created OTP account
            userRepository.findByPhone(request.getPhone()).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    existing.setPhone(null);
                    userRepository.save(existing);
                }
            });

            user.setPhone(request.getPhone());
            User saved = userRepository.save(user);
            return ResponseEntity.ok(toDTO(saved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/profile/link-google — link Google account by verifying token
     */
    @PostMapping("/link-google")
    public ResponseEntity<?> linkGoogle(@RequestBody GoogleAuthDTO request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        try {
            GoogleIdToken idToken = verifier.verify(request.getIdToken());
            if (idToken == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid Google token"));
            }

            String googleId = idToken.getPayload().getSubject();
            User user = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Check if this Google ID is already used by another user
            userRepository.findByGoogleId(googleId).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new RuntimeException("This Google account is already linked to another user");
                }
            });

            user.setGoogleId(googleId);
            User saved = userRepository.save(user);
            return ResponseEntity.ok(toDTO(saved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Google verification failed"));
        }
    }

    /**
     * POST /api/profile/unlink-email — remove email from account
     */
    @PostMapping("/unlink-email")
    public ResponseEntity<?> unlinkEmail(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!hasAlternativeAuth(user, "email")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot unlink your only login method"));
        }
        user.setEmail(null);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(toDTO(saved));
    }

    /**
     * POST /api/profile/unlink-phone — remove phone from account
     */
    @PostMapping("/unlink-phone")
    public ResponseEntity<?> unlinkPhone(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!hasAlternativeAuth(user, "phone")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot unlink your only login method"));
        }
        user.setPhone(null);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(toDTO(saved));
    }

    /**
     * POST /api/profile/unlink-google — remove Google from account
     */
    @PostMapping("/unlink-google")
    public ResponseEntity<?> unlinkGoogle(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!hasAlternativeAuth(user, "google")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot unlink your only login method"));
        }
        user.setGoogleId(null);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(toDTO(saved));
    }

    // ── Helpers ─────────────────────────────────────────────────

    /**
     * Check if the user has at least one other auth method besides the one being removed.
     */
    private boolean hasAlternativeAuth(User user, String methodToRemove) {
        int count = 0;
        if (user.getPassword() != null && !user.getPassword().isEmpty()) count++;
        if (user.getEmail() != null && !"email".equals(methodToRemove)) count++;
        if (user.getPhone() != null && !"phone".equals(methodToRemove)) count++;
        if (user.getGoogleId() != null && !"google".equals(methodToRemove)) count++;
        return count > 0;
    }

    private UserDTO toDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        dto.setDisplayName(user.getDisplayName());
        dto.setBio(user.getBio());
        dto.setGoogleId(user.getGoogleId() != null ? "connected" : null);
        dto.setAuthProvider(user.getAuthProvider() != null ? user.getAuthProvider().name() : null);
        return dto;
    }
}
