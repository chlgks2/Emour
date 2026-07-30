package com.ssafy.emour.couple.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoupleMemberId implements Serializable {

    @Column(name = "room_id")
    private Long roomId;

    @Column(name = "user_id")
    private Long userId;

    /**
     * 채팅 도메인에서 사용하는 순서와 동일하게 userId, roomId 순서로 받는다.
     */
    public CoupleMemberId(Long userId, Long roomId) {
        this.userId = userId;
        this.roomId = roomId;
    }
}
