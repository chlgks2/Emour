package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.ChatReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface ChatReactionRepository
        extends JpaRepository<ChatReaction, Long> {

    Optional<ChatReaction> findByUserIdAndMessage_MessageId(
            Long userId,
            Long messageId
    );

    long countByRoomIdAndUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Long roomId,
            Long userId,
            LocalDateTime start,
            LocalDateTime end
    );

    long countByRoomIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Long roomId,
            LocalDateTime start,
            LocalDateTime end
    );
}
