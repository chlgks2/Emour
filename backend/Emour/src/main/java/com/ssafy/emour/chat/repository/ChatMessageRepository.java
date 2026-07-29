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

    Optional<ChatMessage> findByMessageIdAndDeletedAtIsNull(Long messageId);

    List<ChatMessage> findByRoomIdAndDeletedAtIsNullOrderByMessageIdDesc(
            Long roomId,
            Pageable pageable
    );

    List<ChatMessage> findByRoomIdAndMessageIdLessThanAndDeletedAtIsNullOrderByMessageIdDesc(
            Long roomId,
            Long messageId,
            Pageable pageable
    );

    List<ChatMessage> findByRoomIdAndContentContainingIgnoreCaseAndDeletedAtIsNullOrderByMessageIdDesc(
            Long roomId,
            String keyword,
            Pageable pageable
    );

    List<ChatMessage> findByRoomIdAndContentContainingIgnoreCaseAndMessageIdLessThanAndDeletedAtIsNullOrderByMessageIdDesc(
            Long roomId,
            String keyword,
            Long messageId,
            Pageable pageable
    );

    // 채팅을 한 번도 읽지 않은 경우 상대방이 보낸 전체 메시지를 셉니다.
    long countByRoomIdAndSenderIdNotAndDeletedAtIsNull(
            Long roomId,
            Long userId
    );

    // 마지막 읽은 메시지보다 뒤에 온 상대방 메시지만 셉니다.
    long countByRoomIdAndSenderIdNotAndMessageIdGreaterThanAndDeletedAtIsNull(
            Long roomId,
            Long userId,
            Long lastReadMessageId
    );
}
