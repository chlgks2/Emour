package com.ssafy.emour.member.service;

import com.ssafy.emour.auth.service.RefreshTokenService;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.member.dto.response.MemberProfileImageResponse;
import com.ssafy.emour.member.dto.response.MemberProfileImagesResponse;
import com.ssafy.emour.member.entity.Member;
import com.ssafy.emour.member.entity.MemberStatus;
import com.ssafy.emour.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RefreshTokenService refreshTokenService;

    private MemberService memberService;

    @BeforeEach
    void setUp() {
        memberService = new MemberService(
                memberRepository,
                coupleMemberRepository,
                passwordEncoder,
                refreshTokenService
        );
    }

    // 로그인한 사용자와 활성 커플 상대방의 프로필 이미지를 함께 반환합니다.
    @Test
    void returnsCoupleProfileImages() {
        Member me = member(
                21L,
                "https://example.com/me.png"
        );
        Member partner = member(
                22L,
                "https://example.com/partner.png"
        );
        when(memberRepository.findById(21L))
                .thenReturn(Optional.of(me));
        when(coupleMemberRepository.findActivePartnerUserIds(
                eq(21L),
                any(Pageable.class)
        )).thenReturn(List.of(22L));
        when(memberRepository.findById(22L))
                .thenReturn(Optional.of(partner));

        MemberProfileImagesResponse response =
                memberService.getProfileImages(21L);

        assertThat(response.myUserId()).isEqualTo(21L);
        assertThat(response.myProfileImageUrl())
                .isEqualTo("https://example.com/me.png");
        assertThat(response.partnerUserId()).isEqualTo(22L);
        assertThat(response.partnerProfileImageUrl())
                .isEqualTo("https://example.com/partner.png");
    }

    // 커플 연결 전에는 내 이미지만 반환하고 상대방 값은 null로 둡니다.
    @Test
    void returnsOnlyMyImage() {
        Member me = member(21L, null);
        when(memberRepository.findById(21L))
                .thenReturn(Optional.of(me));
        when(coupleMemberRepository.findActivePartnerUserIds(
                eq(21L),
                any(Pageable.class)
        )).thenReturn(List.of());

        MemberProfileImagesResponse response =
                memberService.getProfileImages(21L);

        assertThat(response.myUserId()).isEqualTo(21L);
        assertThat(response.myProfileImageUrl()).isNull();
        assertThat(response.partnerUserId()).isNull();
        assertThat(response.partnerProfileImageUrl()).isNull();
    }

    // 내 프로필 이미지 API는 로그인한 사용자 정보만 반환합니다.
    @Test
    void returnsMyProfileImage() {
        Member me = member(
                21L,
                "https://example.com/me.png"
        );
        when(memberRepository.findById(21L))
                .thenReturn(Optional.of(me));

        MemberProfileImageResponse response =
                memberService.getMyProfileImage(21L);

        assertThat(response.userId()).isEqualTo(21L);
        assertThat(response.profileImageUrl())
                .isEqualTo("https://example.com/me.png");
    }

    // 상대방 프로필 이미지 API는 활성 커플 상대방 정보만 반환합니다.
    @Test
    void returnsPartnerProfileImage() {
        Member me = member(21L, null);
        Member partner = member(
                22L,
                "https://example.com/partner.png"
        );
        when(memberRepository.findById(21L))
                .thenReturn(Optional.of(me));
        when(coupleMemberRepository.findActivePartnerUserIds(
                eq(21L),
                any(Pageable.class)
        )).thenReturn(List.of(22L));
        when(memberRepository.findById(22L))
                .thenReturn(Optional.of(partner));

        MemberProfileImageResponse response =
                memberService.getPartnerProfileImage(21L);

        assertThat(response.userId()).isEqualTo(22L);
        assertThat(response.profileImageUrl())
                .isEqualTo("https://example.com/partner.png");
    }

    private Member member(Long userId, String imageUrl) {
        Member member = mock(Member.class);
        lenient().when(member.getId()).thenReturn(userId);
        lenient().when(member.getProfileImageUrl())
                .thenReturn(imageUrl);
        when(member.getStatus()).thenReturn(MemberStatus.ACTIVE);
        return member;
    }
}
