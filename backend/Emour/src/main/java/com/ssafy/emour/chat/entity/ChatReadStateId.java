package com.ssafy.emour.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ChatReadStateId implements Serializable {

    @Column(name = "room_id")
    private Long roomId;

    @Column(name = "user_id")
    private Long userId;

    protected ChatReadStateId() {
    }

    public ChatReadStateId(Long userId, Long roomId) {
        this.userId = userId;
        this.roomId = roomId;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getRoomId() {
        return roomId;
    }

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (!(object instanceof ChatReadStateId that)) {
            return false;
        }
        return Objects.equals(userId, that.userId)
                && Objects.equals(roomId, that.roomId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, roomId);
    }
}
