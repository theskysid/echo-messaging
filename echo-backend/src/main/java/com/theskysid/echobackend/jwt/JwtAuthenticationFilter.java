package com.theskysid.echobackend.jwt;

import com.theskysid.echobackend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

   @Autowired
   private JwtService jwtService;

   @Autowired
   private UserRepository userRepository;


   @Override
   protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
      Long userId = null;
      String jwtToken = null;

      String authHeader = request.getHeader("Authorization");

      if (authHeader != null && authHeader.startsWith("Bearer ")) {
         jwtToken = authHeader.substring(7);
      }

      //if jwt token is null, need to check cookies
      if (jwtToken == null) {
         Cookie []  cookies = request.getCookies();
         if (cookies != null) {
            for (Cookie cookie : cookies) {
               if ("JWT".equals(cookie.getName())) {
                  jwtToken = cookie.getValue();
                  break;
               }
            }
         }
      }

      // Comprehensive token validation - ignore any invalid tokens
      if (jwtToken == null || jwtToken.trim().isEmpty() ||
          "null".equalsIgnoreCase(jwtToken) ||
          "undefined".equalsIgnoreCase(jwtToken) ||
          !isValidJwtFormat(jwtToken)) {
         filterChain.doFilter(request, response);
         return;
      }

      try {
         userId = jwtService.extractUserId(jwtToken);

         if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            var userDetails = userRepository.findById(userId).orElseThrow(()-> new RuntimeException("User not found"));

            if (jwtService.isTokenValid(jwtToken, userDetails)){

               UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(userDetails, null, Collections.emptyList());

               authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

               SecurityContextHolder.getContext().setAuthentication(authToken);
            }
         }
      } catch (Exception e) {
         // Log the error but don't fail the request - just proceed without authentication
         System.err.println("JWT processing error: " + e.getMessage());
      }

      filterChain.doFilter(request, response);
      return;
   }

   // Helper method to validate JWT format before parsing
   private boolean isValidJwtFormat(String token) {
      if (token == null || token.trim().isEmpty()) {
         return false;
      }
      // JWT should have exactly 2 dots (3 parts: header.payload.signature)
      long dotCount = token.chars().filter(ch -> ch == '.').count();
      return dotCount == 2 && token.length() > 10; // Minimum reasonable length
   }
}
