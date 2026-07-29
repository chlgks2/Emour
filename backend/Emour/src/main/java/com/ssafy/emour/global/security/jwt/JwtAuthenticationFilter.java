package com.ssafy.emour.global.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * 모든 요청마다 한 번씩 실행되어(OncePerRequestFilter) JWT 를 검사하는 필터.
 *
 * 하는 일:
 *   1) Authorization 헤더에서 "Bearer 토큰" 을 꺼낸다.
 *   2) 토큰이 유효한 access 토큰이면, "이 요청의 주인 = userId" 라고
 *      SecurityContext 에 인증 정보를 심는다.
 *   3) 토큰이 없거나 무효면 아무것도 안 한다 (→ 보호된 URL 이면 나중에 401 처리됨).
 */
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String token = resolveToken(request);

        // 유효한 access 토큰일 때만 인증 정보 저장 (refresh 토큰으로는 API 접근 불가)
        if (token != null
                && jwtTokenProvider.validateToken(token)
                && "access".equals(jwtTokenProvider.getType(token))) {

            Long userId = jwtTokenProvider.getUserId(token);

            // principal(주체) = userId. 권한 목록은 지금은 비워둔다.
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        // 다음 필터로 요청 넘기기 (반드시 호출)
        filterChain.doFilter(request, response);
    }

    /** "Authorization: Bearer xxx" 헤더에서 xxx(토큰)만 꺼낸다. */
    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader(AUTH_HEADER);
        if (StringUtils.hasText(bearer) && bearer.startsWith(BEARER_PREFIX)) {
            return bearer.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
