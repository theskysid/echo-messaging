package com.theskysid.echobackend.repository;

import com.theskysid.echobackend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
}
