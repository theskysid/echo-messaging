package com.theskysid.echobackend.user.service;

import com.theskysid.echobackend.auth.service.OnlineUserService;
import com.theskysid.echobackend.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OnlineUserService onlineUserService;

    public boolean userExists(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean isUserOnline(Long userId) {
        return onlineUserService.isOnline(userId);
    }
}