package com.theskysid.echobackend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponseDto {
   private String token; //in response we will get the jwt token
   private UserDto userDto;

}
