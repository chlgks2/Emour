package com.ssafy.emour.auth.repository;

import com.ssafy.emour.auth.entity.SocialLogin;
import com.ssafy.emour.auth.entity.SocialProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SocialLoginRepository
        extends JpaRepository<SocialLogin, Long> {

    Optional<SocialLogin> findByProviderAndProviderId(
            SocialProvider provider,
            String providerId
    );

    Optional<SocialLogin> findByMemberId(Long memberId);
}
