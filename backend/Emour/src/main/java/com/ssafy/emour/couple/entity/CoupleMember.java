package com.ssafy.emour.couple.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "couple_member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoupleMember {

    @EmbeddedId
    private CoupleMemberId id;

    @Column(name = "partner_nickname", length = 50)
    private String partnerNickname;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private CoupleMemberStatus status;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    public static CoupleMember active(Long userId, Long roomId) {
        CoupleMember member = new CoupleMember();
        member.id = new CoupleMemberId(userId, roomId);
        member.status = CoupleMemberStatus.ACTIVE;
        return member;
    }

    /** 내가 상대방에게 붙인 애칭을 변경합니다. */
    public void updatePartnerNickname(String partnerNickname) {
        this.partnerNickname = partnerNickname;
    }

    public void leave(LocalDateTime leftAt) {
        if (status != CoupleMemberStatus.ACTIVE) {
            throw new IllegalStateException("활성 상태의 커플 멤버만 연결을 해제할 수 있습니다.");
        }
        this.status = CoupleMemberStatus.LEFT;
        this.leftAt = leftAt;
    }

    public void reconnect() {
        if (status != CoupleMemberStatus.LEFT) {
            throw new IllegalStateException(
                    "연결을 해제한 커플 멤버만 재결합할 수 있습니다."
            );
        }
        this.status = CoupleMemberStatus.ACTIVE;
        this.leftAt = null;
    }
}
