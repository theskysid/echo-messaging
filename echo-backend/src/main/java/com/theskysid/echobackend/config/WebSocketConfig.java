package com.theskysid.echobackend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;


@Configuration
@EnableWebSocketMessageBroker //enables message broker support
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
   //routing messages
   @Override
   public void configureMessageBroker(MessageBrokerRegistry config) {

      //enable simple broker for group and user specific/ private chat
      config.enableSimpleBroker("/topic", "/queue", "/user");
      config.setApplicationDestinationPrefixes("/app");
      config.setUserDestinationPrefix("/user");

   }

   //registering the websocket endpoints - with fallback supports
   @Override
   public void registerStompEndpoints(StompEndpointRegistry registry) {

      registry.addEndpoint("/ws") //client connects here
              .setAllowedOrigins("http://localhost:5173", "http://localhost:3000") //setting only allowed endpoints... connection only from these frontends
              .withSockJS(); //enables the fallback if a browser does not support native websockets SockJS emulates it with using HTTP long polling
   }

}
