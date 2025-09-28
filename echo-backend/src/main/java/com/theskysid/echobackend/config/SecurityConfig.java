package com.theskysid.echobackend.config;
//here we create the bean of password encoder and authentication manager in security config

import com.theskysid.echobackend.jwt.JwtAuthenticationFilter;
import com.theskysid.echobackend.service.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import org.springframework.http.HttpMethod;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

   @Autowired
   private JwtAuthenticationFilter jwtAuthenticationFilter;

   @Autowired
   private CustomUserDetails customUserDetails;

   @Bean
   public SecurityFilterChain configure(HttpSecurity http) throws Exception {

      http.csrf(csrf -> csrf.disable())
            .headers(headers -> headers.frameOptions(frameOption -> frameOption.disable()))
            .cors(cors -> cors.configurationSource(addConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                  .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                  .requestMatchers("/auth/**").permitAll()
                  .requestMatchers("/api/auth/register").permitAll()
                  .requestMatchers("/api/auth/login").permitAll()
                  .requestMatchers("/h2-console/**").permitAll()
                  .requestMatchers("/ws/**").permitAll()
                  .anyRequest().authenticated())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

      return http.build();
   }

   @Bean
   public UserDetailsService userDetailsService() {
      return customUserDetails;
   }

   @Bean
   public PasswordEncoder passwordEncoder() {
      return new BCryptPasswordEncoder();
   }

   @Bean
   public AuthenticationProvider authenticationProvider() {
      DaoAuthenticationProvider daoAuthenticationProvider = new DaoAuthenticationProvider();
      daoAuthenticationProvider.setPasswordEncoder(passwordEncoder());
      daoAuthenticationProvider.setUserDetailsService(customUserDetails);
      return daoAuthenticationProvider;
   }

   @Bean
   public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
      return config.getAuthenticationManager();
   }

   @Bean
   public CorsConfigurationSource addConfigurationSource() {

      CorsConfiguration corsConfiguration = new CorsConfiguration();
      corsConfiguration.setAllowedOrigins(
            Arrays.asList("http://localhost:5176", "http://localhost:5174", "http://localhost:5173"));
      corsConfiguration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
      corsConfiguration.setAllowedHeaders(Arrays.asList("*") );
      corsConfiguration.setAllowCredentials(true);
      corsConfiguration.setExposedHeaders(Arrays.asList("Set-Cookie"));

      UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
      source.registerCorsConfiguration("/**", corsConfiguration);

      return source;
   }

}
