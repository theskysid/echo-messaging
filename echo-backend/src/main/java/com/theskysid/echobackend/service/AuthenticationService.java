package com.theskysid.echobackend.service;

import com.theskysid.echobackend.dto.LoginRequestDto;
import com.theskysid.echobackend.dto.LoginResponseDto;
import com.theskysid.echobackend.dto.RegisterRequestDto;
import com.theskysid.echobackend.dto.UserDto;
import com.theskysid.echobackend.jwt.JwtService;
import com.theskysid.echobackend.model.User;
import com.theskysid.echobackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {

   @Autowired
   private UserRepository userRepository;

   @Autowired
   private PasswordEncoder passwordEncoder;

   @Autowired
   private AuthenticationManager authenticationManager;
   //we create the bean of password encoder and authentication manager in security config

   @Autowired
   private JwtService jwtService;

   public UserDto signup(RegisterRequestDto registerRequestDto) {
      if (userRepository.findByUsername(registerRequestDto.getUsername()).isPresent()) {
         throw new RuntimeException("Username is already in use");
      }

      User user = new User();
      user.setUsername(registerRequestDto.getUsername());
      user.setPassword(passwordEncoder.encode(registerRequestDto.getPassword()));
      user.setEmail(registerRequestDto.getEmail());

      User savedUser = userRepository.save(user);
      return convertToUserDto(user);

   }

   public LoginResponseDto login(LoginRequestDto loginRequestDto) {
      User user = userRepository.findByUsername(loginRequestDto.getUsername())
              .orElseThrow(() -> new RuntimeException("Username not found"));

      authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(loginRequestDto.getUsername(), loginRequestDto.getPassword()));
      String jwtToken = jwtService.generateToken(user);

      return LoginResponseDto.builder()
              .token(jwtToken)
              .userDto(convertToUserDto(user))
              .build();
   }

   public ResponseEntity<String> logout() {

   }

   public UserDto convertToUserDto(User user) {
      UserDto userDto = new UserDto();
      userDto.setId(user.getId());
      userDto.setEmail(user.getEmail());
      userDto.setUsername(user.getUsername());
   }
}
