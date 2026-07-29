package com.ssafy.emour.couple.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "couple_member")
public class CoupleMember {

    @EmbeddedId
    private CoupleMemberId id;

    @Column(name = "partner_nickname", length = 50)
    private String partnerNickname;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private CoupleMemberStatus status;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    protected CoupleMember() {
    }

    // 테스트 데이터나 커플 연결 기능에서 활성 멤버를 만들 때 사용합니다.
    public static CoupleMember active(Long userId, Long roomId) {
        CoupleMember member = new CoupleMember();
        member.id = new CoupleMemberId(userId, roomId);
        member.status = CoupleMemberStatus.ACTIVE;
        member.joinedAt = LocalDateTime.now();
        return member;
    }
}
