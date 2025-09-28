package com.theskysid.echobackend.controller;

import com.theskysid.echobackend.dto.LoginRequestDto;
import com.theskysid.echobackend.dto.LoginResponseDto;
import com.theskysid.echobackend.dto.RegisterRequestDto;
import com.theskysid.echobackend.dto.UserDto;
import com.theskysid.echobackend.model.User;
import com.theskysid.echobackend.repository.UserRepository;
import com.theskysid.echobackend.service.AuthenticationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = { "http://localhost:5176", "http://localhost:5174" }, allowCredentials = "true")
public class AuthController {

   @Autowired
   private AuthenticationService authenticationService;

   @Autowired
   private UserRepository userRepository;

   @PostMapping("/register")
   public ResponseEntity<UserDto> register(@RequestBody RegisterRequestDto registerRequestDto) {
      return ResponseEntity.ok(authenticationService.signup(registerRequestDto));
   }

   @PostMapping("/login")
   public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequestDto loginRequestDto) {

      LoginResponseDto loginResponseDto = authenticationService.login(loginRequestDto);

      // Create response with both user data and token
      Map<String, Object> response = new HashMap<>();
      response.put("user", loginResponseDto.getUserDto());
      response.put("token", loginResponseDto.getToken());

      // Also set as httpOnly cookie for additional security
      ResponseCookie responseCookie = ResponseCookie.from("JWT", loginResponseDto.getToken())
            .httpOnly(true)
            .secure(false) // Set to false for localhost development
            .path("/")
            .maxAge(1 * 60 * 60) // 1 hour
            .build();

      return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, responseCookie.toString())
            .body(response);
   }

   @PostMapping("/logout")
   public ResponseEntity<String> logout() {
      return authenticationService.logout();
   }

   @GetMapping("/getonlineusers")
   public ResponseEntity<Map<String, Object>> getOnlineUsers() {
      return ResponseEntity.ok(authenticationService.getOnlineUsers());
   }

   @GetMapping("/getcurrentuser")
   public ResponseEntity<?> getCurrentUser(Authentication authentication) {
      if (authentication == null) {
         return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
      }

      // Get the user directly from the principal (set by JWT filter)
      User user = (User) authentication.getPrincipal();

      return ResponseEntity.ok(convertToUserDto(user)); // converting the user to UserDto
   }

   public UserDto convertToUserDto(User user) {
      UserDto userDto = new UserDto();

      userDto.setId(user.getId());
      userDto.setEmail(user.getEmail());
      userDto.setUsername(user.getUsername());

      return userDto;
   }

}
