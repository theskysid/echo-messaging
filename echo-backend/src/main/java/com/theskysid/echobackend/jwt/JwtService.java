package com.theskysid.echobackend.jwt;

import com.theskysid.echobackend.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

@Service
public class JwtService {

   @Value("${jwt.secret}")
   private String secretkey;

   @Value("${jwt.expiration}")
   private Long jwtExpiration;

   //extract the user id from the token
   public Long extractUserId(String jwtToken) {
      String userIdStr = extractClaim(jwtToken, claims -> claims.get("userId", String.class));

      return userIdStr != null ? Long.parseLong(userIdStr) : null;
   }

   private <T> T extractClaim(String jwtToken, Function<Claims, T> claimsResolver) {
      final Claims claims = extractAllClaims(jwtToken);
      return claimsResolver.apply(claims);
   }

   public Claims extractAllClaims(String jwtToken) {
      return Jwts.parser()
              .verifyWith(getSignInKey())
              .build()
              .parseSignedClaims(jwtToken)
              .getPayload();
   }

   public SecretKey getSignInKey() {
      return Keys.hmacShaKeyFor(secretkey.getBytes());
   }


   public String generateToken(User user){
      return generateToken(new HashMap<>(), user);
   }

   public String generateToken(Map<String, Object> extraClaims, User user){
      Map<String, Object> claims = new HashMap<>(extraClaims);
      claims.put("userId", user.getId());

      return Jwts.builder().claims(claims)
              .subject(user.getUsername())
              .issuedAt(new Date(System.currentTimeMillis()))
              .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
              .signWith(getSignInKey())
              .compact();
   }
   // now we will fetch the userid from the token and also from the user and match it... also the expirations if it is expired or not
   public boolean isTokenValid(String jwtToken, User user){

      final Long userIdFromToken = extractUserId(jwtToken); //method created earlier
      final Long userId = user.getId();

      return (userIdFromToken != null && userId.equals(userIdFromToken) && isTokenExpired(jwtToken));

   }

   public boolean isTokenExpired(String jwtToken){
      return extractExpiration(jwtToken).before(new Date())
   }

   private Date extractExpiration(String jwtToken){
      return extractClaim(jwtToken, Claims::getExpiration);
   }
}
