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
        name = "chat_bookmark",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_chat_bookmark_user_message",
                columnNames = {"user_id", "message_id"}
        )
)
public class ChatBookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bookmark_id")
    private Long bookmarkId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private ChatMessage message;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ChatBookmark() {
    }

    public static ChatBookmark create(
            Long roomId,
            Long userId,
            ChatMessage message
    ) {
        ChatBookmark bookmark = new ChatBookmark();
        bookmark.roomId = roomId;
        bookmark.userId = userId;
        bookmark.message = message;
        bookmark.createdAt = LocalDateTime.now();
        return bookmark;
    }

    public Long getBookmarkId() {
        return bookmarkId;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
