package com.theskysid.echobackend.auth.service;

import com.theskysid.echobackend.auth.dto.request.LoginRequestDTO;
import com.theskysid.echobackend.auth.dto.request.RegisterRequestDTO;
import com.theskysid.echobackend.auth.dto.response.LoginResponseDTO;
import com.theskysid.echobackend.user.dto.UserDTO;
import com.theskysid.echobackend.auth.jwt.JwtService;
import com.theskysid.echobackend.user.entity.AuthProvider;
import com.theskysid.echobackend.user.entity.User;
import com.theskysid.echobackend.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

@Service
public class AuthenticationService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private OnlineUserService onlineUserService;

    @Value("${app.secure-cookie:true}")
    private boolean secureCookie;

    public UserDTO signup(RegisterRequestDTO registerRequestDTO) {
        if (userRepository.findByUsername(registerRequestDTO.getUsername()).isPresent()) {
            throw new RuntimeException("Username is already in use");
        }
        User user = new User();
        user.setUsername(registerRequestDTO.getUsername());
        user.setPassword(passwordEncoder.encode(registerRequestDTO.getPassword()));
        user.setEmail(registerRequestDTO.getEmail());
        user.setAuthProvider(AuthProvider.EMAIL);
        return convertToUserDTO(userRepository.save(user));
    }

    public LoginResponseDTO login(LoginRequestDTO loginRequestDTO) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequestDTO.getUsername(), loginRequestDTO.getPassword()));

        User user = userRepository.findByUsername(loginRequestDTO.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        onlineUserService.markOnline(user.getId());

        return LoginResponseDTO.builder()
                .token(jwtService.generateToken(user))
                .userDTO(convertToUserDTO(user))
                .build();
    }

    public ResponseEntity<String> logout() {
        ResponseCookie cookie = ResponseCookie.from("JWT", "")
                .httpOnly(true)
                .secure(secureCookie)
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body("Logged out successfully");
    }

    public Map<String, Object> getOnlineUsers() {
        Set<Long> onlineIds = onlineUserService.getOnlineUserIds();
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("onlineUserIds", onlineIds);
        result.put("count", onlineIds.size());
        return result;
    }

    public UserDTO convertToUserDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        return dto;
    }
}