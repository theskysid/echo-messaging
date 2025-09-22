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


@RestController
@RequestMapping("/auth")
public class AuthController {

   @Autowired
   private AuthenticationService authenticationService;

   @Autowired
   private UserRepository userRepository;

   @PostMapping("/signup")
   public ResponseEntity<UserDto> signUp(@RequestBody RegisterRequestDto registerRequestDto) {
      return ResponseEntity.ok(authenticationService.signup(registerRequestDto));
   }

   @PostMapping("/login")
   public ResponseEntity<UserDto> login(@RequestBody LoginRequestDto loginRequestDto) {

      LoginResponseDto  loginResponseDto = authenticationService.login(loginRequestDto);

      ResponseCookie responseCookie = ResponseCookie.from("JWT", loginResponseDto.getToken())
              .httpOnly(true)
              .secure(true)
              .path("/")
              .maxAge(1*60*60) //1 hour
              .build();
      return ResponseEntity.ok()
              .header(HttpHeaders.SET_COOKIE, responseCookie.toString())
              .body(loginResponseDto.getUserDto());
   }

   @PostMapping("/logout")
   public ResponseEntity<String> logout() {
      return authenticationService.logout();
   }

   @GetMapping("/getcurrentuser")
   public ResponseEntity<?> getCurrentUser(Authentication authentication) {
      if (authentication == null) {
         return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
      }

      String username = authentication.getName();
      User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Username not found"));

      return ResponseEntity.ok(convertToUserDto(user)); //converting the user to UserDto
   }

   public UserDto convertToUserDto(User user) {
      UserDto userDto = new UserDto();

      userDto.setId(user.getId());
      userDto.setEmail(user.getEmail());
      userDto.setUsername(user.getUsername());

      return userDto;
   }

}
