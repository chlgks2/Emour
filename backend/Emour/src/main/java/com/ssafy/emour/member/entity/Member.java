package com.ssafy.emour.member.entity;

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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 회원 엔티티. DB 테이블 app_user 와 1:1 로 매핑된다.
 *
 * 팀 전체가 FK 로 참조하는 공용 기반 테이블이므로 신중히 다룬다.
 */
@Entity  // "이 클래스는 DB 테이블과 매핑되는 엔티티다"
@Table(
        name = "app_user",  // 매핑할 실제 테이블 이름 (user 는 예약어라 app_user 사용)
        uniqueConstraints = @UniqueConstraint(name = "uk_app_user_email", columnNames = "email")
)
@Getter  // 모든 필드의 getter 자동 생성 (Lombok)
@NoArgsConstructor(access = AccessLevel.PROTECTED)  // JPA 가 요구하는 기본 생성자. 외부에서 함부로 못 만들게 protected
public class Member {

    @Id  // 기본키(PK)
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // MySQL AUTO_INCREMENT (DB 가 id 자동 생성)
    @Column(name = "user_id")
    private Long id;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    // 비밀번호는 BCrypt 로 암호화한 "해시" 를 저장. 소셜 로그인 유저는 비밀번호가 없어 NULL 가능.
    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "nickname", nullable = false, length = 50)
    private String nickname;

    @Column(name = "birth")
    private LocalDate birth;

    @Column(name = "profile_image_url", length = 2048)
    private String profileImageUrl;

    @Column(name = "status_message", length = 255)
    private String statusMessage;

    // 이메일 인증 완료 여부. 이메일 가입자는 false 로 시작, 소셜 가입자는 true 로 생성.
    @Column(name = "is_email_verified", nullable = false)
    private boolean emailVerified = false;

    @Enumerated(EnumType.STRING)  // enum 을 이름 문자열("ACTIVE")로 저장. 순서(숫자) 저장은 위험해서 STRING 권장
    @Column(name = "status", nullable = false, length = 20)
    private MemberStatus status = MemberStatus.ACTIVE;

    @CreationTimestamp  // insert 시각 자동 기록 (Hibernate)
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp  // update 시각 자동 갱신 (Hibernate)
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // 회원탈퇴 시각. NULL 이면 정상 회원, 값이 있으면 탈퇴한 회원(soft delete).
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * 이메일 회원가입용 생성자.
     * 객체를 아무렇게나 만들지 못하도록 @Builder 로 통제한다.
     * (birth, 프로필 등은 가입 후 마이페이지에서 채우므로 여기선 필수값만 받는다.)
     */
    @Builder
    private Member(String email, String passwordHash, String nickname) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.nickname = nickname;
    }

    // ===== 상태를 바꾸는 행위는 setter 대신 의미 있는 메서드로 표현한다 =====

    /** 이메일 인증 완료 처리 */
    public void verifyEmail() {
        this.emailVerified = true;
    }

    /** 비밀번호 변경 (이미 BCrypt 로 암호화된 값을 받는다) */
    public void changePassword(String encodedPassword) {
        this.passwordHash = encodedPassword;
    }

    /** 프로필 부분 수정 (null 로 온 필드는 변경하지 않음) */
    public void updateProfile(String nickname, LocalDate birth, String profileImageUrl, String statusMessage) {
        if (nickname != null) this.nickname = nickname;
        if (birth != null) this.birth = birth;
        if (profileImageUrl != null) this.profileImageUrl = profileImageUrl;
        if (statusMessage != null) this.statusMessage = statusMessage;
    }

    /** 업로드가 끝난 프로필 이미지의 접근 주소를 저장합니다. */
    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    /** 회원 탈퇴 (soft delete): 상태를 WITHDRAWN 으로, 탈퇴 시각 기록 */
    public void withdraw() {
        this.status = MemberStatus.WITHDRAWN;
        this.deletedAt = LocalDateTime.now();
    }
}
