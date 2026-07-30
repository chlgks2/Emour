package com.ssafy.emour.member.service;

import com.ssafy.emour.auth.service.RefreshTokenService;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.dto.request.PasswordChangeRequest;
import com.ssafy.emour.member.dto.request.ProfileUpdateRequest;
import com.ssafy.emour.member.dto.response.MemberProfileResponse;
import com.ssafy.emour.member.entity.Member;
import com.ssafy.emour.member.entity.MemberStatus;
import com.ssafy.emour.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 회원(마이페이지) 관련 비즈니스 로직.
 */
@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    /** 내 프로필 조회 */
    @Transactional(readOnly = true)
    public MemberProfileResponse getMyProfile(Long userId) {
        return MemberProfileResponse.from(getActiveMember(userId));
    }

    /** 프로필 수정 (부분 수정) */
    @Transactional
    public MemberProfileResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        Member member = getActiveMember(userId);
        member.updateProfile(
                request.nickname(),
                request.birth(),
                request.profileImageUrl(),
                request.statusMessage()
        );
        return MemberProfileResponse.from(member);
    }

    /** 비밀번호 변경 (현재 비밀번호 확인 후) */
    @Transactional
    public void changePassword(Long userId, PasswordChangeRequest request) {
        Member member = getActiveMember(userId);

        // 소셜 전용 계정(비번 없음)이거나 현재 비번이 틀리면 거부
        if (member.getPasswordHash() == null
                || !passwordEncoder.matches(request.currentPassword(), member.getPasswordHash())) {
            throw new CustomException(ErrorCode.INVALID_PASSWORD);
        }

        member.changePassword(passwordEncoder.encode(request.newPassword()));
    }

    /** 회원 탈퇴 (soft delete + 로그인 세션 무효화) */
    @Transactional
    public void withdraw(Long userId) {
        Member member = getActiveMember(userId);
        member.withdraw();
        refreshTokenService.delete(userId); // refresh 삭제 → 토큰 재발급 차단
    }

    /**
     * 활성 회원 조회 공통 메서드.
     * 없거나 이미 탈퇴한 회원이면 예외.
     */
    private Member getActiveMember(Long userId) {
        Member member = memberRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        if (member.getStatus() == MemberStatus.WITHDRAWN) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }
        return member;
    }
}
