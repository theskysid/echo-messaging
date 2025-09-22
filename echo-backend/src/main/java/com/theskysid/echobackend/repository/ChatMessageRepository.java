package com.theskysid.echobackend.repository;

import com.theskysid.echobackend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {


   @Query("SELECT cm from ChatMessage cm WHERE cm.type = 'PRIVATE_MESSAGE' AND" + "((cm.sender = :user1 AND cm.recepient= :user2) OR (cm.sender = :user2 AND cm.recepient= :user1))" + "ORDER BY cm.timestamp ASC")
   List<ChatMessage> findPrivateMessagesBetweenTwoUsers(@Param("user1") String user1, @Param("user2") String user2);




}
