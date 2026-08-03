package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    Optional<ChatMessage> findBySenderIdAndClientMessageId(
            Long senderId,
            String clientMessageId
    );

    Optional<ChatMessage> findByMessageId(Long messageId);

    List<ChatMessage> findByRoomIdOrderByMessageIdDesc(
            Long roomId,
            Pageable pageable
    );

    List<ChatMessage> findByRoomIdAndMessageIdLessThanOrderByMessageIdDesc(
            Long roomId,
            Long messageId,
            Pageable pageable
    );

    List<ChatMessage> findByRoomIdAndContentContainingIgnoreCaseOrderByMessageIdDesc(
            Long roomId,
            String keyword,
            Pageable pageable
    );

    List<ChatMessage> findByRoomIdAndContentContainingIgnoreCaseAndMessageIdLessThanOrderByMessageIdDesc(
            Long roomId,
            String keyword,
            Long messageId,
            Pageable pageable
    );

    // 채팅을 한 번도 읽지 않은 경우 상대방이 보낸 전체 메시지를 셉니다.
    long countByRoomIdAndSenderIdNot(
            Long roomId,
            Long userId
    );

    // 마지막 읽은 메시지보다 뒤에 온 상대방 메시지만 셉니다.
    long countByRoomIdAndSenderIdNotAndMessageIdGreaterThan(
            Long roomId,
            Long userId,
            Long lastReadMessageId
    );

    long countByRoomIdAndSenderIdAndSentAtGreaterThanEqualAndSentAtLessThan(
            Long roomId,
            Long senderId,
            LocalDateTime start,
            LocalDateTime end
    );

    long countByRoomIdAndSentAtGreaterThanEqualAndSentAtLessThan(
            Long roomId,
            LocalDateTime start,
            LocalDateTime end
    );

    @Query("""
            select count(image)
            from ChatMessage message
            join message.images image
            where message.roomId = :roomId
              and message.senderId = :userId
              and message.sentAt >= :start
              and message.sentAt < :end
            """)
    long countImages(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("""
            select count(image)
            from ChatMessage message
            join message.images image
            where message.roomId = :roomId
              and message.sentAt >= :start
              and message.sentAt < :end
            """)
    long countRoomImages(
            @Param("roomId") Long roomId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("""
            select message.content
            from ChatMessage message
            where message.roomId = :roomId
              and message.senderId = :userId
              and message.messageType =
                  com.ssafy.emour.chat.entity.MessageType.TEXT
              and message.content is not null
              and message.sentAt >= :start
              and message.sentAt < :end
            """)
    List<String> findDailyTextContents(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("""
            select message.content
            from ChatMessage message
            where message.roomId = :roomId
              and message.messageType =
                  com.ssafy.emour.chat.entity.MessageType.TEXT
              and message.content is not null
              and message.sentAt >= :start
              and message.sentAt < :end
            """)
    List<String> findRoomTextContents(
            @Param("roomId") Long roomId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("""
            select message
            from ChatMessage message
            where message.roomId = :roomId
              and message.sentAt >= :start
              and message.sentAt < :end
            order by message.sentAt asc, message.messageId asc
            """)
    List<ChatMessage> findConversationMessages(
            @Param("roomId") Long roomId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
