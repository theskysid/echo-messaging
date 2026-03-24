package com.theskysid.echobackend.messaging.websocket;

import com.theskysid.echobackend.auth.service.OnlineUserService;
import com.theskysid.echobackend.messaging.entity.ChatMessage;
import com.theskysid.echobackend.user.entity.User;
import com.theskysid.echobackend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketListener {

    @Autowired private UserRepository userRepository;
    @Autowired private OnlineUserService onlineUserService;
    @Autowired private SimpMessageSendingOperations messagingTemplate;

    private static final Logger logger = LoggerFactory.getLogger(WebSocketListener.class);

    @EventListener
    public void handleWebsocketConnectListener(SessionConnectedEvent event) {
        logger.info("New WebSocket connection established");
    }

    @EventListener
    public void handleWebsocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if (username == null) return;

        userRepository.findByUsername(username).map(User::getId)
                .ifPresent(onlineUserService::markOffline);

        ChatMessage chatMessage = new ChatMessage();
        chatMessage.setType(ChatMessage.MessageType.LEAVE);
        chatMessage.setSender(username);
        messagingTemplate.convertAndSend("/topic/public", chatMessage);
    }
}