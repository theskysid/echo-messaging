package com.theskysid.echobackend.dto;

import lombok.Data;

@Data
public class RegisterRequestDto {
   private  String username;
   private String password;
   private String email;
}
