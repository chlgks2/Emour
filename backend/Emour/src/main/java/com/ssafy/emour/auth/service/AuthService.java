package com.ssafy.emour.auth.service;

import com.ssafy.emour.auth.dto.request.LoginRequest;
import com.ssafy.emour.auth.dto.request.SignUpRequest;
import com.ssafy.emour.auth.dto.response.LoginResponse;
import com.ssafy.emour.auth.dto.response.SignUpResponse;
import com.ssafy.emour.auth.dto.response.TokenResponse;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.global.security.jwt.JwtTokenProvider;
import com.ssafy.emour.member.entity.Member;
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

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;       // 토큰 발급/검증
    private final RefreshTokenService refreshTokenService; // Redis 에 refresh 저장

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

        // 2) 비밀번호 대조 (평문 입력 vs 저장된 해시)
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
}
