package com.ssafy.emour.chat.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(
        name = "chat_message",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_chat_message_client",
                        columnNames = {"sender_id", "client_message_id"}
                ),
                @UniqueConstraint(
                        name = "uq_chat_message_room",
                        columnNames = {"message_id", "room_id"}
                )
        }
)
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "client_message_id", nullable = false, length = 36)
    private String clientMessageId;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 10)
    private MessageType messageType;

    @Column(name = "content", length = 2000)
    private String content;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @OneToMany(
            mappedBy = "message",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @OrderBy("displayOrder ASC")
    private List<ChatMessageImage> images = new ArrayList<>();

    protected ChatMessage() {
    }

    public static ChatMessage create(
            Long roomId,
            Long senderId,
            String clientMessageId,
            MessageType messageType,
            String content
    ) {
        ChatMessage message = new ChatMessage();
        message.roomId = roomId;
        message.senderId = senderId;
        message.clientMessageId = clientMessageId;
        message.messageType = messageType;
        message.content = content;
        message.sentAt = LocalDateTime.now();
        return message;
    }

    public void addImage(String imageUrl, int displayOrder) {
        // 이미지가 자신이 속한 메시지를 알 수 있도록 양쪽을 연결합니다.
        images.add(ChatMessageImage.create(this, imageUrl, displayOrder));
    }

    public Long getMessageId() {
        return messageId;
    }

    public Long getRoomId() {
        return roomId;
    }

    public Long getSenderId() {
        return senderId;
    }

    public String getClientMessageId() {
        return clientMessageId;
    }

    public MessageType getMessageType() {
        return messageType;
    }

    public String getContent() {
        return content;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public List<ChatMessageImage> getImages() {
        return Collections.unmodifiableList(images);
    }
}
