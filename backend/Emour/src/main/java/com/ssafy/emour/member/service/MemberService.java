package com.ssafy.emour.member.service;

import com.ssafy.emour.auth.service.RefreshTokenService;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.global.storage.FileStorage;
import com.ssafy.emour.member.dto.request.PasswordChangeRequest;
import com.ssafy.emour.member.dto.request.ProfileUpdateRequest;
import com.ssafy.emour.member.dto.response.MemberProfileResponse;
import com.ssafy.emour.member.entity.Member;
import com.ssafy.emour.member.entity.MemberStatus;
import com.ssafy.emour.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * 회원(마이페이지) 관련 비즈니스 로직.
 */
@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final FileStorage fileStorage; // 프로필 이미지 저장 (앨범과 동일 저장소 재사용)

    @Value("${app.upload.base-url}")
    private String baseUrl;

    /** 내 프로필 조회 */
    @Transactional(readOnly = true)
    public MemberProfileResponse getMyProfile(Long userId) {
        return MemberProfileResponse.from(getActiveMember(userId), baseUrl);
    }

    /** 프로필 수정 (부분 수정 — 텍스트 필드만. 이미지는 별도 API) */
    @Transactional
    public MemberProfileResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        Member member = getActiveMember(userId);
        member.updateProfile(
                request.nickname(),
                request.birth(),
                request.statusMessage()
        );
        return MemberProfileResponse.from(member, baseUrl);
    }

    /** 프로필 사진 업로드/교체 */
    @Transactional
    public MemberProfileResponse updateProfileImage(Long userId, MultipartFile file) {
        Member member = getActiveMember(userId);

        String oldKey = member.getProfileImageKey();
        String newKey = fileStorage.store(file); // 새 파일 저장
        member.updateProfileImage(newKey);

        if (oldKey != null) {
            fileStorage.delete(oldKey); // 기존 사진 파일 삭제(교체)
        }
        return MemberProfileResponse.from(member, baseUrl);
    }

    /** 프로필 사진 삭제 (기본 이미지로) */
    @Transactional
    public MemberProfileResponse deleteProfileImage(Long userId) {
        Member member = getActiveMember(userId);

        String oldKey = member.getProfileImageKey();
        member.updateProfileImage(null);

        if (oldKey != null) {
            fileStorage.delete(oldKey);
        }
        return MemberProfileResponse.from(member, baseUrl);
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
