package com.ssafy.emour.global.util;

import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 현재 요청을 보낸 로그인 회원의 정보를 꺼내는 도구.
 *
 * JwtAuthenticationFilter 가 SecurityContext 에 심어둔 principal(=userId)을 읽어온다.
 * 컨트롤러/서비스에서 SecurityUtil.getCurrentUserId() 로 "지금 이 요청의 주인"을 알 수 있다.
 */
public final class SecurityUtil {

    private SecurityUtil() {
    }

    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        return userId;
    }
}
