package com.ssafy.emour.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_read_state")
public class ChatReadState {

    @EmbeddedId
    private ChatReadStateId id;

    @Column(name = "last_read_message_id")
    private Long lastReadMessageId;

    @Column(name = "read_at", nullable = false)
    private LocalDateTime readAt;

    protected ChatReadState() {
    }

    public static ChatReadState first(
            Long userId,
            Long roomId,
            Long messageId
    ) {
        ChatReadState state = new ChatReadState();
        state.id = new ChatReadStateId(userId, roomId);
        state.lastReadMessageId = messageId;
        state.readAt = LocalDateTime.now();
        return state;
    }

    public void moveForward(Long messageId) {
        // 읽은 위치는 과거로 되돌아가지 않고 앞으로만 이동합니다.
        if (lastReadMessageId == null || messageId > lastReadMessageId) {
            lastReadMessageId = messageId;
            readAt = LocalDateTime.now();
        }
    }

    public Long getUserId() {
        return id.getUserId();
    }

    public Long getRoomId() {
        return id.getRoomId();
    }

    public Long getLastReadMessageId() {
        return lastReadMessageId;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }
}
