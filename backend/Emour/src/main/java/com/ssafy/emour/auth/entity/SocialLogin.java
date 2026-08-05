package com.ssafy.emour.auth.entity;

import com.ssafy.emour.member.entity.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "social_login",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_social_login_provider_id",
                columnNames = {"provider", "provider_id"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SocialLogin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "social_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 30)
    private SocialProvider provider;

    @Column(name = "provider_id", nullable = false, length = 255)
    private String providerId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private SocialLogin(
            Member member,
            SocialProvider provider,
            String providerId
    ) {
        this.member = member;
        this.provider = provider;
        this.providerId = providerId;
    }

    public static SocialLogin google(Member member, String providerId) {
        return new SocialLogin(member, SocialProvider.GOOGLE, providerId);
    }
}
