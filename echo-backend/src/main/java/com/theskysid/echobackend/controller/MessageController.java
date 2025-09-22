package com.theskysid.echobackend.controller;

import com.theskysid.echobackend.model.ChatMessage;
import com.theskysid.echobackend.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

   @Autowired
   private ChatMessageRepository chatMessageRepository;


   public ResponseEntity<List<ChatMessage>> getPrivateMessages(@RequestParam String user1, @RequestParam String user2) {

      List<ChatMessage> messages = chatMessageRepository.findPrivateMessagesBetweenTwoUsers(user1, user2);
      return ResponseEntity.ok(messages);

   }

}
