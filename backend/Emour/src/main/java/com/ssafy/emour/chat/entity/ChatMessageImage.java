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
        name = "chat_message_image",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_chat_message_image_order",
                columnNames = {"message_id", "display_order"}
        )
)
public class ChatMessageImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_id")
    private Long imageId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private ChatMessage message;

    @Column(name = "image_url", nullable = false, length = 2048)
    private String imageUrl;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ChatMessageImage() {
    }

    static ChatMessageImage create(
            ChatMessage message,
            String imageUrl,
            int displayOrder
    ) {
        ChatMessageImage image = new ChatMessageImage();
        image.message = message;
        image.imageUrl = imageUrl;
        image.displayOrder = displayOrder;
        image.createdAt = LocalDateTime.now();
        return image;
    }

    public Long getImageId() {
        return imageId;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public Long getMessageId() {
        return message.getMessageId();
    }

    public Long getSenderId() {
        return message.getSenderId();
    }

    public LocalDateTime getSentAt() {
        return message.getSentAt();
    }
}
