package com.ssafy.emour.auth.service;

import com.ssafy.emour.auth.dto.request.LoginRequest;
import com.ssafy.emour.auth.dto.request.SignUpRequest;
import com.ssafy.emour.auth.dto.response.LoginResponse;
import com.ssafy.emour.auth.dto.response.SignUpResponse;
import com.ssafy.emour.auth.dto.response.TokenResponse;
import com.ssafy.emour.global.email.EmailSender;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.global.security.jwt.JwtTokenProvider;
import com.ssafy.emour.member.entity.Member;
import com.ssafy.emour.member.entity.MemberStatus;
import com.ssafy.emour.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 인증 관련 비즈니스 로직.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String PURPOSE_SIGN_UP = "SIGN_UP";
    private static final String PURPOSE_PASSWORD_RESET = "PASSWORD_RESET";

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;             // 토큰 발급/검증
    private final RefreshTokenService refreshTokenService;       // Redis 에 refresh 저장
    private final VerificationCodeService verificationCodeService; // 이메일 인증코드 관리
    private final EmailSender emailSender;                       // 이메일 발송
    private final GoogleTokenVerifier googleTokenVerifier;      // 구글 ID 토큰 검증

    /**
     * 이메일 회원가입.
     */
    @Transactional
    public SignUpResponse signUp(SignUpRequest request) {
        // 1) 이메일 중복 검사
        if (memberRepository.existsByEmail(request.email())) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        // 2) 비밀번호 BCrypt 해시
        String encodedPassword = passwordEncoder.encode(request.password());

        // 3) 회원 생성 + 저장
        Member member = Member.builder()
                .email(request.email())
                .passwordHash(encodedPassword)
                .nickname(request.nickname())
                .build();
        Member saved = memberRepository.save(member);

        // 4) 안전한 응답 DTO 로 변환
        return SignUpResponse.from(saved);
    }

    /**
     * 이메일 사용 가능 여부(중복확인).
     */
    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        return !memberRepository.existsByEmail(email);
    }

    /**
     * 이메일 로그인.
     * 1) 이메일로 회원 조회 → 2) 비밀번호 대조 → 3) 토큰 발급 → 4) refresh 를 Redis 저장
     *
     * 보안 팁: "이메일 없음"과 "비밀번호 틀림"을 구분하지 않고 같은 에러로 응답한다.
     *          (어느 이메일이 가입돼 있는지 공격자에게 알려주지 않기 위함)
     */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        // 1) 이메일로 회원 찾기 — 없으면 자격증명 오류
        Member member = memberRepository.findByEmail(request.email())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));

        // 2) 탈퇴한 회원은 로그인 불가
        if (member.getStatus() == MemberStatus.WITHDRAWN) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }

        // 3) 비밀번호 대조 (평문 입력 vs 저장된 해시)
        //    소셜 전용 계정은 passwordHash 가 null 이므로 이메일 로그인 불가
        if (member.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), member.getPasswordHash())) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }

        // 3) 토큰 2종 발급
        String accessToken = jwtTokenProvider.createAccessToken(member.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(member.getId());

        // 4) Refresh Token 을 Redis 에 저장 (유효기간만큼 살아있다가 자동 만료)
        refreshTokenService.save(
                member.getId(),
                refreshToken,
                jwtTokenProvider.getRefreshTokenValidityMs()
        );

        return LoginResponse.of(member, accessToken, refreshToken);
    }

    /**
     * 구글 소셜 로그인.
     * 1) 구글 ID 토큰 검증 → 2) 이메일로 회원 조회(없으면 소셜 계정 생성)
     * → 3) 우리 서비스 JWT 발급 → 4) refresh 를 Redis 저장
     *
     * 소셜로 새로 생성되는 계정은 passwordHash 가 null 이라 이메일/비번 로그인은 불가하며,
     * 구글이 이미 확인한 이메일이므로 emailVerified 를 true 로 둔다.
     */
    @Transactional
    public LoginResponse loginWithGoogle(String idToken) {
        GoogleUserInfo info = googleTokenVerifier.verify(idToken);

        Member member = memberRepository.findByEmail(info.email())
                .orElseGet(() -> registerGoogleMember(info));

        // 탈퇴한 회원은 로그인 불가
        if (member.getStatus() == MemberStatus.WITHDRAWN) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }

        String accessToken = jwtTokenProvider.createAccessToken(member.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(member.getId());
        refreshTokenService.save(
                member.getId(),
                refreshToken,
                jwtTokenProvider.getRefreshTokenValidityMs()
        );

        return LoginResponse.of(member, accessToken, refreshToken);
    }

    private Member registerGoogleMember(GoogleUserInfo info) {
        Member member = Member.builder()
                .email(info.email())
                .passwordHash(null)              // 소셜 전용 계정: 이메일/비번 로그인 불가
                .nickname(resolveGoogleNickname(info))
                .build();
        member.verifyEmail();                    // 구글이 이미 검증한 이메일
        return memberRepository.save(member);
    }

    private String resolveGoogleNickname(GoogleUserInfo info) {
        String raw = (info.name() != null && !info.name().isBlank())
                ? info.name().trim()
                : info.email().split("@")[0];
        // 닉네임 컬럼 길이(50) 보호
        return raw.length() > 50 ? raw.substring(0, 50) : raw;
    }

    /**
     * 로그아웃.
     * Redis 에 저장된 Refresh Token 을 삭제해 더 이상 토큰 재발급이 안 되게 한다.
     *
     * 참고: 이미 발급된 Access Token 은 무상태(stateless)라 만료(30분) 전까지는 유효하다.
     *       즉시 무효화가 필요하면 별도의 "블랙리스트"(Redis)를 도입할 수 있다(추후 고려).
     */
    @Transactional
    public void logout(Long userId) {
        refreshTokenService.delete(userId);
    }

    /**
     * Access Token 재발급.
     * Refresh Token 을 검증하고, Redis 에 저장된 값과 일치할 때만 새 Access Token 을 발급한다.
     */
    public TokenResponse reissue(String refreshToken) {
        // 1) refresh 토큰 자체가 유효한가 (서명/만료 + 종류가 refresh 인지)
        if (!jwtTokenProvider.validateToken(refreshToken)
                || !"refresh".equals(jwtTokenProvider.getType(refreshToken))) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        Long userId = jwtTokenProvider.getUserId(refreshToken);

        // 2) Redis 에 저장된 refresh 와 일치하는가 (로그아웃했거나 탈취/재사용이면 불일치 → 거부)
        String stored = refreshTokenService.findByUserId(userId);
        if (stored == null || !stored.equals(refreshToken)) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        // 3) 새 Access Token 발급
        String newAccessToken = jwtTokenProvider.createAccessToken(userId);
        return TokenResponse.ofAccessToken(newAccessToken);
    }

    /**
     * 이메일 인증코드 발송.
     * 6자리 코드를 만들어 Redis(5분)에 저장하고 이메일로 보낸다(지금은 콘솔 출력).
     */
    public void sendSignUpVerificationCode(String email) {
        String code = verificationCodeService.generateAndStore(PURPOSE_SIGN_UP, email);
        emailSender.send(
                email,
                "[Emour] 이메일 인증코드",
                "인증코드는 [" + code + "] 입니다. 5분 안에 입력해 주세요."
        );
    }

    /**
     * 이메일 인증코드 확인.
     * 코드가 맞으면 해당 회원의 is_email_verified 를 true 로 바꾼다.
     * (Member 를 조회해 verifyEmail() 만 호출하면 트랜잭션 종료 시 JPA 가 자동 UPDATE)
     */
    @Transactional
    public void verifySignUpCode(String email, String code) {
        // 1) 코드 검증
        if (!verificationCodeService.verify(PURPOSE_SIGN_UP, email, code)) {
            throw new CustomException(ErrorCode.INVALID_VERIFICATION_CODE);
        }

        // 2) 회원의 이메일 인증 상태를 true 로
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        member.verifyEmail();

        // 3) 사용한 코드는 삭제(재사용 방지)
        verificationCodeService.delete(PURPOSE_SIGN_UP, email);
    }

    /**
     * 비밀번호 재설정 코드 발송.
     * 보안: 가입되지 않은 이메일인지 알려주지 않기 위해, 회원이 있을 때만 실제로 보내고
     *       응답은 항상 성공으로 통일한다(이메일 존재 여부 노출 방지).
     */
    public void sendPasswordResetCode(String email) {
        memberRepository.findByEmail(email).ifPresent(member -> {
            String code = verificationCodeService.generateAndStore(PURPOSE_PASSWORD_RESET, email);
            emailSender.send(
                    email,
                    "[Emour] 비밀번호 재설정 인증코드",
                    "인증코드는 [" + code + "] 입니다. 5분 안에 입력해 주세요."
            );
        });
    }

    /**
     * 비밀번호 재설정 코드 확인. (프론트가 새 비밀번호 입력 화면으로 넘어갈지 판단용)
     * 여기선 코드를 소비하지 않는다 — 실제 소비는 재설정(resetPassword)에서.
     */
    public void verifyPasswordResetCode(String email, String code) {
        if (!verificationCodeService.verify(PURPOSE_PASSWORD_RESET, email, code)) {
            throw new CustomException(ErrorCode.INVALID_VERIFICATION_CODE);
        }
    }

    /**
     * 비밀번호 재설정.
     * 코드를 다시 검증한 뒤 새 비밀번호로 변경하고, 코드 삭제 + 기존 로그인(refresh) 무효화.
     */
    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        // 1) 코드 재검증
        if (!verificationCodeService.verify(PURPOSE_PASSWORD_RESET, email, code)) {
            throw new CustomException(ErrorCode.INVALID_VERIFICATION_CODE);
        }

        // 2) 회원 조회
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 3) 새 비밀번호 암호화 후 변경 (dirty checking 으로 자동 UPDATE)
        member.changePassword(passwordEncoder.encode(newPassword));

        // 4) 코드 소비 + 보안상 기존 refresh 토큰 삭제(비번 바뀌면 다시 로그인)
        verificationCodeService.delete(PURPOSE_PASSWORD_RESET, email);
        refreshTokenService.delete(member.getId());
    }
}
