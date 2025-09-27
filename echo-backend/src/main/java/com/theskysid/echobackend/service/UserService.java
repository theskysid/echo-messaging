package com.theskysid.echobackend.service;

import com.theskysid.echobackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

   @Autowired
   UserRepository userRepository;

   public boolean userExists(String username) {
      return userRepository.existsByUsername(username);
   }

   public void setUserOnlineStatus(String username, boolean isOnline) {
      userRepository.updateUserOnlineStatus(username, isOnline);
   }
}
