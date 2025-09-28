package com.theskysid.echobackend.listener;

import com.theskysid.echobackend.model.ChatMessage;
import com.theskysid.echobackend.repository.ChatMessageRepository;
import com.theskysid.echobackend.service.UserService;
import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

//handles the connection or disconnection handling -- like siddhant added to group or left the group
@Component
public class WebSocketListener {

   @Autowired
   private UserService userService;

   @Autowired
   private SimpMessageSendingOperations messagingTemplate;

   private static final Logger logger = LoggerFactory.getLogger(WebSocketListener.class);

   @Autowired
   private ChatMessageRepository chatMessageRepository;

   @EventListener
   public void handleWebSocketConnectListener(SessionConnectedEvent event) {
      logger.info("Connected to websocket");
   }

   @EventListener
   public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {

      StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

      if (headerAccessor.getSessionAttributes() != null &&
          headerAccessor.getSessionAttributes().get("username") != null) {
         String username = headerAccessor.getSessionAttributes().get("username").toString();

         logger.info("User Disconnected from socket: " + username);

         userService.setUserOnlineStatus(username, false);
         ChatMessage chatMessage = new ChatMessage();
         chatMessage.setType(ChatMessage.MessageType.LEAVE);
         chatMessage.setSender(username);
         messagingTemplate.convertAndSend("/topic/public", chatMessage);
      }
   }
}
