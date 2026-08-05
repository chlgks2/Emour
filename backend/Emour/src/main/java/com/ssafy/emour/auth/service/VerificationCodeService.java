package com.ssafy.emour.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;

/**
 * 이메일 인증코드를 생성하고 Redis 에 저장/검증한다.
 *
 * 저장 형태: key = "email-verify:{purpose}:{email}", value = 6자리 코드
 * TTL 5분 → 5분 지나면 Redis 가 자동 삭제(만료).
 *
 * purpose 예: "SIGN_UP"(회원가입 인증), "PASSWORD_RESET"(비밀번호 재설정)
 */
@Service
@RequiredArgsConstructor
public class VerificationCodeService {

    private static final String KEY_PREFIX = "email-verify:";
    private static final Duration TTL = Duration.ofMinutes(5);
    // 인증 통과한 이메일 표시. 회원가입 폼을 채울 시간을 고려해 코드보다 길게(30분) 둔다.
    private static final String VERIFIED_PREFIX = "email-verified:";
    private static final Duration VERIFIED_TTL = Duration.ofMinutes(30);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redisTemplate;

    /** 코드 생성 후 Redis 에 저장하고, 생성된 코드를 반환(발송용) */
    public String generateAndStore(String purpose, String email) {
        String code = generateCode();
        redisTemplate.opsForValue().set(key(purpose, email), code, TTL);
        return code;
    }

    /** 입력 코드가 저장된 코드와 일치하는지 검증 */
    public boolean verify(String purpose, String email, String code) {
        String stored = redisTemplate.opsForValue().get(key(purpose, email));
        return stored != null && stored.equals(code);
    }

    /** 사용 완료된 코드 삭제(재사용 방지) */
    public void delete(String purpose, String email) {
        redisTemplate.delete(key(purpose, email));
    }

    /** 코드 검증에 성공한 이메일을 '인증됨'으로 표시(회원가입 때 확인용) */
    public void markVerified(String purpose, String email) {
        redisTemplate.opsForValue().set(verifiedKey(purpose, email), "true", VERIFIED_TTL);
    }

    /** 이 이메일이 인증을 통과한 상태인지 */
    public boolean isVerified(String purpose, String email) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(verifiedKey(purpose, email)));
    }

    /** 사용 완료된 인증 표시 삭제 */
    public void clearVerified(String purpose, String email) {
        redisTemplate.delete(verifiedKey(purpose, email));
    }

    private String key(String purpose, String email) {
        return KEY_PREFIX + purpose + ":" + email;
    }

    private String verifiedKey(String purpose, String email) {
        return VERIFIED_PREFIX + purpose + ":" + email;
    }

    private String generateCode() {
        return String.format("%06d", RANDOM.nextInt(1_000_000)); // 000000 ~ 999999
    }
}
