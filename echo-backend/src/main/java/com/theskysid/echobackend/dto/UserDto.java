package com.theskysid.echobackend.dto;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Data
public class UserDto {

   private long id;

   @Column(unique = true, nullable = false)
   private String username;

   @Column(nullable = false)
   private String email;

   @Column(nullable = false, name = "is_Online")
   private boolean isOnline;
}
