package com.ssafy.emour.couple.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "couple_room",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_couple_room_room_code",
                columnNames = "room_code"
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoupleRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Long id;

    @Column(name = "room_code", nullable = false, length = 32)
    private String roomCode;

    @Column(name = "room_code_expires_at")
    private LocalDateTime roomCodeExpiresAt;

    @Column(name = "dating_start_date")
    private LocalDate datingStartDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CoupleRoomStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static CoupleRoom waiting(String roomCode, LocalDateTime expiresAt) {
        CoupleRoom room = new CoupleRoom();
        room.roomCode = roomCode;
        room.roomCodeExpiresAt = expiresAt;
        room.status = CoupleRoomStatus.WAITING;
        return room;
    }

    public void refreshInvitation(String roomCode, LocalDateTime expiresAt) {
        if (status != CoupleRoomStatus.WAITING) {
            throw new IllegalStateException("대기 중인 커플방만 초대 코드를 갱신할 수 있습니다.");
        }
        this.roomCode = roomCode;
        this.roomCodeExpiresAt = expiresAt;
    }

    public boolean hasValidInvitationAt(LocalDateTime currentTime) {
        return status == CoupleRoomStatus.WAITING
                && roomCodeExpiresAt != null
                && roomCodeExpiresAt.isAfter(currentTime);
    }

    public void activate() {
        if (status != CoupleRoomStatus.WAITING) {
            throw new IllegalStateException("대기 중인 커플방만 연결할 수 있습니다.");
        }
        this.status = CoupleRoomStatus.ACTIVE;
    }

    public void deactivate() {
        if (status != CoupleRoomStatus.ACTIVE) {
            throw new IllegalStateException("활성 상태의 커플방만 연결을 해제할 수 있습니다.");
        }
        this.status = CoupleRoomStatus.INACTIVE;
    }
}
