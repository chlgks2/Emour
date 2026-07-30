package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.ChatReadState;
import com.ssafy.emour.chat.entity.ChatReadStateId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatReadStateRepository
        extends JpaRepository<ChatReadState, ChatReadStateId> {
}
