package com.ssafy.emour.global.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 토큰의 발급과 검증을 담당하는 핵심 클래스.
 *
 * secret(비밀키)과 유효기간은 application.yml 의 jwt.* 설정에서 주입받는다.
 */
@Component
public class JwtTokenProvider {

    private final SecretKey key;              // 서명/검증에 쓰는 비밀키
    private final long accessTokenValidityMs; // Access Token 유효기간(밀리초)
    private final long refreshTokenValidityMs;// Refresh Token 유효기간(밀리초)

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-validity-ms}") long accessTokenValidityMs,
            @Value("${jwt.refresh-token-validity-ms}") long refreshTokenValidityMs
    ) {
        // 문자열 secret 을 서명용 키 객체로 변환 (secret 은 32바이트 이상이어야 함)
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenValidityMs = accessTokenValidityMs;
        this.refreshTokenValidityMs = refreshTokenValidityMs;
    }

    /** Access Token 발급 (subject = 회원 id) */
    public String createAccessToken(Long userId) {
        return createToken(userId, "access", accessTokenValidityMs);
    }

    /** Refresh Token 발급 */
    public String createRefreshToken(Long userId) {
        return createToken(userId, "refresh", refreshTokenValidityMs);
    }

    private String createToken(Long userId, String type, long validityMs) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(String.valueOf(userId))     // 이 토큰의 주인 = 회원 id
                .claim("type", type)                 // access / refresh 구분용
                .issuedAt(new Date(now))             // 발급 시각
                .expiration(new Date(now + validityMs)) // 만료 시각
                .signWith(key)                       // 비밀키로 서명 (위조 방지)
                .compact();
    }

    /** 토큰에서 회원 id 추출 (서명 검증 포함) */
    public Long getUserId(String token) {
        return Long.valueOf(parseClaims(token).getSubject());
    }

    /** 토큰이 유효한지(서명 정상 + 만료 전) 검사 */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // 서명 위조, 만료, 형식 오류 등 → 모두 무효 처리
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)          // 비밀키로 서명 검증
                .build()
                .parseSignedClaims(token) // 파싱 (실패 시 예외)
                .getPayload();
    }

    /** Refresh Token 유효기간(밀리초) — Redis 저장 시 만료시간(TTL)으로 사용 */
    public long getRefreshTokenValidityMs() {
        return refreshTokenValidityMs;
    }
}
