package com.theskysid.echobackend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponseDTO {

    private String token;
    private UserDTO userDTO;
}
