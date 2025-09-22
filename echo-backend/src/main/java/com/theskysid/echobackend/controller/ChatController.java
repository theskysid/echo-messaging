package com.theskysid.echobackend.controller;

import com.theskysid.echobackend.model.ChatMessage;
import com.theskysid.echobackend.repository.ChatMessageRepository;
import com.theskysid.echobackend.service.UserService;
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


   @MessageMapping("/chat.addUser") //web socket destination
   @SendTo("/topic/public") //gets the return of this method and send to this channel
   public ChatMessage addUser(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) { //user added to chat area - private or group

      //checks if user is already exist in the session
      if(userService.userExists(chatMessage.getSender())){
         //store username in session
         headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
         //setting user online
         userService.setUserOnlineStatus(chatMessage.getSender(), true);

         System.out.println("User added Successfully"+ chatMessage.getSender() + headerAccessor.getSessionId());

         chatMessage.setTimestamp(LocalDateTime.now());

         if (chatMessage.getContent() == null){
            chatMessage.setContent("");
         }
         return chatMessageRepository.save(chatMessage);
      }
      return null;
   }

   //either added in the group
   @MessageMapping("/chat.sendMessage")
   @SendTo("/topic/public")
   public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
      if (userService.userExists(chatMessage.getSender())){
         if (chatMessage.getTimestamp() == null) {
            chatMessage.setTimestamp(LocalDateTime.now());
         }
         if (chatMessage.getContent() == null) {
            chatMessage.setContent("");
         }

         return chatMessageRepository.save(chatMessage);
      }
      return null;
   }

   //or either add in the private chat area
   @MessageMapping("/chat.sendPrivateMessage")
   public void sendPrivateMessage(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
      //we need to tell the exact path where to send the message
      if (userService.userExists(chatMessage.getSender()) && userService.userExists(chatMessage.getRecepient())){

         if (chatMessage.getTimestamp() == null) {
            chatMessage.setTimestamp(LocalDateTime.now());
         }

         if (chatMessage.getContent() == null) {
            chatMessage.setContent("");
         }

         chatMessage.setType(ChatMessage.MessageType.PRIVATE_MESSAGE);

         ChatMessage savedMessage = chatMessageRepository.save(chatMessage);
         System.out.println("Message saved successfully with the id" + savedMessage.getId());

         try {
            //getting confirmation from the receiptent and getting its path
            String receiptentDestination = "/user/" + chatMessage.getRecepient()+ "/queue/private";
            System.out.println("Sending Message to destination" + receiptentDestination);
            messagingTemplate.convertAndSend(receiptentDestination, savedMessage);

            String senderDestination = "/user/" + chatMessage.getSender()+ "/queue/private";
            System.out.println("Sending Message to sender destination" + senderDestination);
            messagingTemplate.convertAndSend(senderDestination, savedMessage);
         } catch (Exception e) {
            System.out.println("Error while sending message to destination" + e.getMessage());
         }

      } else {
         System.out.println("Error: Sendor" +  chatMessage.getSender() + "or recepient" +  chatMessage.getRecepient() + "does not exist");
      }
   }
}
