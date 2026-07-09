package com.theskysid.echobackend.messaging.controller;

import com.theskysid.echobackend.auth.service.OnlineUserService;
import com.theskysid.echobackend.auth.util.IdentifierNormalizer;
import com.theskysid.echobackend.messaging.entity.ChatMessage;
import com.theskysid.echobackend.messaging.repository.ChatMessageRepository;
import com.theskysid.echobackend.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
public class ChatController {

    @Autowired
    private UserService userService;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private OnlineUserService onlineUserService;

    //first the hit endpoint is checked in the config then accordingly it hits the specific methods

    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public") //automatic broadcasting to all the users
    public ChatMessage addUser(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        String username = IdentifierNormalizer.normalizeUsername(chatMessage.getSender());
        String sessionId = headerAccessor.getSessionId();

        if (username.isBlank() || !userService.userExists(username)) {
            return null;
        }

        if (headerAccessor.getSessionAttributes() != null) {
            headerAccessor.getSessionAttributes().put("username", username);
        }

        boolean shouldBroadcastJoin = onlineUserService.registerSession(username, sessionId);
        if (!shouldBroadcastJoin) {
            return null;
        }

        chatMessage.setSender(username);

        chatMessage.setType(ChatMessage.MessageType.JOIN);
        chatMessage.setTimestamp(LocalDateTime.now());

        if (chatMessage.getContent() == null) {
            chatMessage.setContent("");
        }

        return chatMessage;
    }

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {

        if (!userService.userExists(chatMessage.getSender())) {
            return null;
        }

        if (chatMessage.getTimestamp() == null) {
            chatMessage.setTimestamp(LocalDateTime.now());
        }

        if (chatMessage.getContent() == null) {
            chatMessage.setContent("");
        }

        // Save only real chat messages
        if (chatMessage.getType() == ChatMessage.MessageType.CHAT) {
            return chatMessageRepository.save(chatMessage);
        }

        // TYPING / JOIN / LEAVE → broadcast only
        return chatMessage;
    }

    @MessageMapping("/chat.sendPrivateMessage")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {

        if (userService.userExists(chatMessage.getSender()) && userService.userExists(chatMessage.getRecipient())) {

            if (chatMessage.getTimestamp() == null) {
                chatMessage.setTimestamp(LocalDateTime.now());
            }

            if (chatMessage.getContent() == null) {
                chatMessage.setContent("");
            }

            chatMessage.setType(ChatMessage.MessageType.PRIVATE_MESSAGE);

            ChatMessage savedMessage = chatMessageRepository.save(chatMessage);
            System.out.println("Message saved successfully with Id " + savedMessage.getId());

            try {
                String recepientDestination = "/user/" + chatMessage.getRecipient() + "/queue/private";
                System.out.println("Sending message to recepient destination " + recepientDestination);
                messagingTemplate.convertAndSend(recepientDestination, savedMessage);

                String senderDestination = "/user/" + chatMessage.getSender() + "/queue/private";
                System.out.println("Sending message to sender destination " + senderDestination);
                messagingTemplate.convertAndSend(senderDestination, savedMessage);
            } catch (Exception e) {
                System.out.println("ERROR occured while sending the message " + e.getMessage());
                e.printStackTrace();
            }
        } else {
            System.out.println("ERROR: Sender " + chatMessage.getSender() + " or recepient "
                    + chatMessage.getRecipient() + " does not exist");
        }
    }
}
