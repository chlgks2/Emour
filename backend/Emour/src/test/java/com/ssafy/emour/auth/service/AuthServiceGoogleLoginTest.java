package com.ssafy.emour.auth.service;

import com.ssafy.emour.auth.entity.SocialLogin;
import com.ssafy.emour.auth.entity.SocialProvider;
import com.ssafy.emour.auth.repository.SocialLoginRepository;
import com.ssafy.emour.global.email.EmailSender;
import com.ssafy.emour.global.security.jwt.JwtTokenProvider;
import com.ssafy.emour.member.entity.Member;
import com.ssafy.emour.member.entity.MemberStatus;
import com.ssafy.emour.member.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceGoogleLoginTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private VerificationCodeService verificationCodeService;
    @Mock
    private EmailSender emailSender;
    @Mock
    private GoogleTokenVerifier googleTokenVerifier;
    @Mock
    private SocialLoginRepository socialLoginRepository;

    @InjectMocks
    private AuthService authService;

    @Test
    void backfillsSocialLoginForExistingGoogleMember() {
        GoogleUserInfo googleUser = googleUser();
        Member member = member();
        when(googleTokenVerifier.verify("id-token"))
                .thenReturn(googleUser);
        when(socialLoginRepository.findByProviderAndProviderId(
                SocialProvider.GOOGLE,
                "google-sub-123"
        )).thenReturn(Optional.empty());
        when(memberRepository.findByEmail("user@example.com"))
                .thenReturn(Optional.of(member));
        when(socialLoginRepository.findByMemberId(21L))
                .thenReturn(Optional.empty());
        when(jwtTokenProvider.createAccessToken(21L))
                .thenReturn("access-token");
        when(jwtTokenProvider.createRefreshToken(21L))
                .thenReturn("refresh-token");
        when(jwtTokenProvider.getRefreshTokenValidityMs())
                .thenReturn(1000L);

        authService.loginWithGoogle("id-token");

        ArgumentCaptor<SocialLogin> captor =
                ArgumentCaptor.forClass(SocialLogin.class);
        verify(socialLoginRepository).save(captor.capture());
        SocialLogin saved = captor.getValue();
        assertThat(saved.getMember()).isSameAs(member);
        assertThat(saved.getProvider()).isEqualTo(SocialProvider.GOOGLE);
        assertThat(saved.getProviderId()).isEqualTo("google-sub-123");
    }

    @Test
    void logsInWithLinkedGoogleProviderId() {
        GoogleUserInfo googleUser = googleUser();
        Member member = member();
        SocialLogin socialLogin = org.mockito.Mockito.mock(
                SocialLogin.class
        );
        when(googleTokenVerifier.verify("id-token"))
                .thenReturn(googleUser);
        when(socialLoginRepository.findByProviderAndProviderId(
                SocialProvider.GOOGLE,
                "google-sub-123"
        )).thenReturn(Optional.of(socialLogin));
        when(socialLogin.getMember()).thenReturn(member);
        when(jwtTokenProvider.createAccessToken(21L))
                .thenReturn("access-token");
        when(jwtTokenProvider.createRefreshToken(21L))
                .thenReturn("refresh-token");
        when(jwtTokenProvider.getRefreshTokenValidityMs())
                .thenReturn(1000L);

        authService.loginWithGoogle("id-token");

        verify(memberRepository, never()).findByEmail("user@example.com");
        verify(socialLoginRepository, never()).save(
                org.mockito.ArgumentMatchers.any()
        );
    }

    private GoogleUserInfo googleUser() {
        return new GoogleUserInfo(
                "google-sub-123",
                "user@example.com",
                "구글 사용자",
                null,
                true
        );
    }

    private Member member() {
        Member member = org.mockito.Mockito.mock(Member.class);
        when(member.getId()).thenReturn(21L);
        when(member.getNickname()).thenReturn("구글 사용자");
        when(member.getStatus()).thenReturn(MemberStatus.ACTIVE);
        return member;
    }
}
