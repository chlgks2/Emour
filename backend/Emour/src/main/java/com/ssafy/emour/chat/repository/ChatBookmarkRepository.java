package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.ChatBookmark;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
            select bookmark
            from ChatBookmark bookmark
            join fetch bookmark.message message
            where bookmark.roomId = :roomId
              and bookmark.userId = :userId
              and message.sentAt >= :start
              and message.sentAt < :end
            order by bookmark.bookmarkId desc
            """)
    List<ChatBookmark> findPeriodBookmarks(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable
    );

    @Query("""
            select bookmark
            from ChatBookmark bookmark
            join fetch bookmark.message message
            where bookmark.roomId = :roomId
              and bookmark.userId = :userId
              and bookmark.bookmarkId < :beforeBookmarkId
              and message.sentAt >= :start
              and message.sentAt < :end
            order by bookmark.bookmarkId desc
            """)
    List<ChatBookmark> findPeriodBookmarksBefore(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId,
            @Param("beforeBookmarkId") Long beforeBookmarkId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
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
