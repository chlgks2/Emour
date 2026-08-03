package com.ssafy.emour.member.service;

import com.ssafy.emour.auth.service.RefreshTokenService;
import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.global.storage.FileStorage;
import com.ssafy.emour.member.dto.request.PasswordChangeRequest;
import com.ssafy.emour.member.dto.request.PartnerNicknameRequest;
import com.ssafy.emour.member.dto.request.ProfileUpdateRequest;
import com.ssafy.emour.member.dto.response.MemberProfileImageResponse;
import com.ssafy.emour.member.dto.response.MemberProfileResponse;
import com.ssafy.emour.member.dto.response.MemberProfileImagesResponse;
import com.ssafy.emour.member.dto.response.PartnerNicknameResponse;
import com.ssafy.emour.member.entity.Member;
import com.ssafy.emour.member.entity.MemberStatus;
import com.ssafy.emour.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

/**
 * 회원(마이페이지) 관련 비즈니스 로직.
 */
@Service
@RequiredArgsConstructor
public class MemberService {

    private static final String IMAGE_URL_PREFIX = "/uploads/";
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private final MemberRepository memberRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final FileStorage fileStorage;

    /** 내 프로필 조회 */
    @Transactional(readOnly = true)
    public MemberProfileResponse getMyProfile(Long userId) {
        return MemberProfileResponse.from(getActiveMember(userId));
    }

    /** 로그인한 사용자의 프로필 이미지만 조회합니다. */
    @Transactional(readOnly = true)
    public MemberProfileImageResponse getMyProfileImage(Long userId) {
        Member me = getActiveMember(userId);
        return toProfileImageResponse(me);
    }

    /** 현재 연결된 커플 상대방의 프로필 이미지만 조회합니다. */
    @Transactional(readOnly = true)
    public MemberProfileImageResponse getPartnerProfileImage(Long userId) {
        getActiveMember(userId);
        Member partner = findActivePartner(userId);

        if (partner == null) {
            return new MemberProfileImageResponse(null, null);
        }
        return toProfileImageResponse(partner);
    }

    /** 로그인한 사용자와 현재 커플 상대방의 프로필 이미지를 함께 조회합니다. */
    @Transactional(readOnly = true)
    public MemberProfileImagesResponse getProfileImages(Long userId) {
        Member me = getActiveMember(userId);
        Member partner = findActivePartner(userId);

        return new MemberProfileImagesResponse(
                me.getId(),
                me.getProfileImageUrl(),
                partner == null ? null : partner.getId(),
                partner == null ? null : partner.getProfileImageUrl()
        );
    }

    /** 등록한 애칭이 없으면 상대방이 회원가입할 때 정한 닉네임을 반환합니다. */
    @Transactional(readOnly = true)
    public PartnerNicknameResponse getPartnerNickname(Long userId) {
        getActiveMember(userId);
        CoupleMember membership = findActiveMembership(userId);
        Member partner = getActivePartner(userId);

        return toPartnerNicknameResponse(membership, partner);
    }

    /** 로그인 사용자의 커플 멤버 행에 상대방 애칭을 저장합니다. */
    @Transactional
    public PartnerNicknameResponse updatePartnerNickname(
            Long userId,
            PartnerNicknameRequest request
    ) {
        getActiveMember(userId);
        CoupleMember membership = findActiveMembership(userId);
        Member partner = getActivePartner(userId);

        String partnerNickname = request.partnerNickname().trim();
        membership.updatePartnerNickname(partnerNickname);

        return new PartnerNicknameResponse(
                partner.getId(),
                partnerNickname,
                true
        );
    }

    /** 로그인한 사용자의 프로필 이미지를 저장하고 DB의 이미지 주소를 변경합니다. */
    @Transactional
    public MemberProfileImageResponse uploadProfileImage(
            Long userId,
            MultipartFile file
    ) {
        Member member = getActiveMember(userId);
        validateProfileImage(file);

        // 실제 파일을 저장하고 브라우저에서 접근할 수 있는 URL로 바꿉니다.
        String storedKey = fileStorage.store(file);
        String imageUrl = toImageUrl(storedKey);

        member.updateProfileImage(imageUrl);
        return new MemberProfileImageResponse(member.getId(), imageUrl);
    }

    private void validateProfileImage(MultipartFile file) {
        if (file == null || file.isEmpty()
                || !ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            throw new CustomException(ErrorCode.INVALID_IMAGE_FILE);
        }
    }

    private String toImageUrl(String key) {
        String normalizedKey = key.replace('\\', '/');
        return IMAGE_URL_PREFIX
                + (normalizedKey.startsWith("/")
                ? normalizedKey.substring(1)
                : normalizedKey);
    }

    private Member findActivePartner(Long userId) {
        List<Long> partnerIds =
                coupleMemberRepository.findActivePartnerUserIds(
                        userId,
                        PageRequest.of(0, 1)
                );

        if (partnerIds.isEmpty()) {
            return null;
        }

        return memberRepository
                .findById(partnerIds.get(0))
                .filter(member ->
                        member.getStatus() != MemberStatus.WITHDRAWN)
                .orElse(null);
    }

    private Member getActivePartner(Long userId) {
        Member partner = findActivePartner(userId);
        if (partner == null) {
            throw new CustomException(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);
        }
        return partner;
    }

    private CoupleMember findActiveMembership(Long userId) {
        List<CoupleMember> memberships =
                coupleMemberRepository.findActiveMembershipsByUserId(
                        userId,
                        PageRequest.of(0, 1)
                );

        if (memberships.isEmpty()) {
            throw new CustomException(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);
        }
        return memberships.get(0);
    }

    private PartnerNicknameResponse toPartnerNicknameResponse(
            CoupleMember membership,
            Member partner
    ) {
        String customNickname = membership.getPartnerNickname();
        boolean customized = customNickname != null
                && !customNickname.isBlank();

        return new PartnerNicknameResponse(
                partner.getId(),
                customized ? customNickname : partner.getNickname(),
                customized
        );
    }

    private MemberProfileImageResponse toProfileImageResponse(
            Member member
    ) {
        return new MemberProfileImageResponse(
                member.getId(),
                member.getProfileImageUrl()
        );
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
