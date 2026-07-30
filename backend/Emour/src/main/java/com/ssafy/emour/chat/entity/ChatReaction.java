package com.ssafy.emour.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "chat_reaction",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_chat_reaction_user_message",
                columnNames = {"user_id", "message_id"}
        )
)
public class ChatReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reaction_id")
    private Long reactionId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private ChatMessage message;

    // 반응 종류가 추가되어도 DB 스키마를 바꾸지 않도록 문자열로 저장합니다.
    @Column(name = "reaction_type", nullable = false, length = 255)
    private String reactionType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ChatReaction() {
    }

    public static ChatReaction create(
            Long roomId,
            Long userId,
            ChatMessage message,
            String reactionType
    ) {
        ChatReaction reaction = new ChatReaction();
        reaction.roomId = roomId;
        reaction.userId = userId;
        reaction.message = message;
        reaction.reactionType = reactionType;
        reaction.createdAt = LocalDateTime.now();
        reaction.updatedAt = reaction.createdAt;

        // 메시지 조회 응답에서도 새 반응이 바로 보이도록 양쪽을 연결합니다.
        message.addReaction(reaction);
        return reaction;
    }

    public void changeType(String reactionType) {
        this.reactionType = reactionType;
        this.updatedAt = LocalDateTime.now();
    }

    public void detachFromMessage() {
        message.removeReaction(this);
    }

    public Long getReactionId() {
        return reactionId;
    }

    public Long getRoomId() {
        return roomId;
    }

    public Long getUserId() {
        return userId;
    }

    public ChatMessage getMessage() {
        return message;
    }

    public String getReactionType() {
        return reactionType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
