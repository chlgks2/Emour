package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    Optional<ChatMessage> findBySenderIdAndClientMessageId(
            Long senderId,
            String clientMessageId
    );

    List<ChatMessage> findByRoomIdAndDeletedAtIsNullOrderByMessageIdDesc(
            Long roomId,
            Pageable pageable
    );

    List<ChatMessage> findByRoomIdAndMessageIdLessThanAndDeletedAtIsNullOrderByMessageIdDesc(
            Long roomId,
            Long messageId,
            Pageable pageable
    );
}
