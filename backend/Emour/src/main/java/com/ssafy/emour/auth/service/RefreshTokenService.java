package com.ssafy.emour.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Refresh Token 을 Redis 에 저장/조회/삭제한다.
 *
 * 저장 형태:  key = "refresh:{userId}",  value = refreshToken 문자열
 * TTL(만료시간)을 주면 Redis 가 그 시간 뒤 자동으로 삭제해 준다.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final String KEY_PREFIX = "refresh:";

    private final StringRedisTemplate redisTemplate;

    /** 저장 (로그인 시). ttlMs 뒤 자동 만료 */
    public void save(Long userId, String refreshToken, long ttlMs) {
        redisTemplate.opsForValue()
                .set(KEY_PREFIX + userId, refreshToken, Duration.ofMillis(ttlMs));
    }

    /** 조회 (토큰 재발급 시 대조용). 없으면 null */
    public String findByUserId(Long userId) {
        return redisTemplate.opsForValue().get(KEY_PREFIX + userId);
    }

    /** 삭제 (로그아웃 시) */
    public void delete(Long userId) {
        redisTemplate.delete(KEY_PREFIX + userId);
    }
}
