package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.ChatBookmark;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ChatBookmarkRepository
        extends JpaRepository<ChatBookmark, Long> {

    Optional<ChatBookmark> findByUserIdAndMessage_MessageId(
            Long userId,
            Long messageId
    );

    List<ChatBookmark> findByRoomIdAndUserIdOrderByBookmarkIdDesc(
            Long roomId,
            Long userId,
            Pageable pageable
    );

    List<ChatBookmark> findByRoomIdAndUserIdAndBookmarkIdLessThanOrderByBookmarkIdDesc(
            Long roomId,
            Long userId,
            Long bookmarkId,
            Pageable pageable
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
