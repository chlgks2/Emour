package com.ssafy.emour.global.config;

import com.ssafy.emour.global.security.jwt.JwtAuthenticationEntryPoint;
import com.ssafy.emour.global.security.jwt.JwtAuthenticationFilter;
import com.ssafy.emour.global.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security 설정.
 *
 * - JWT 방식이므로 세션을 만들지 않는다(STATELESS).
 * - /auth/** (회원가입/로그인 등)와 회원가입 관련은 인증 없이 허용.
 * - 로그아웃과 그 외 모든 요청은 로그인(유효한 access 토큰) 필수.
 * - 우리 JwtAuthenticationFilter 를 스프링 기본 인증 필터 앞에 끼워넣는다.
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 접근 규칙 (위에서부터 순서대로 매칭 — 구체적인 것 먼저)
                .authorizeHttpRequests(auth -> auth
                        // 배포 서버는 로그인 없이 서버의 정상 실행 여부만 확인합니다.
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/auth/logout").authenticated() // 로그아웃은 로그인 상태여야 함
                        .requestMatchers("/auth/**").permitAll()          // 그 외 인증 API 는 누구나
                        // WebSocket은 STOMP CONNECT 헤더의 JWT로 별도 인증한다.
                        .requestMatchers("/ws/**").permitAll()
                        // img 태그는 Authorization 헤더를 보낼 수 없으므로
                        // UUID 기반 업로드 이미지 조회 경로는 공개한다.
                        .requestMatchers("/uploads/**").permitAll()
                        // API 문서와 로컬 채팅 테스트 화면은 로그인 전에도 열 수 있다.
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/websocket-test.html"
                        ).permitAll()
                        .anyRequest().authenticated()                     // 나머지는 전부 로그인 필수
                )
                // 인증 실패(토큰 없음/무효) 시 401 을 우리 형식으로 응답
                .exceptionHandling(ex ->
                        ex.authenticationEntryPoint(jwtAuthenticationEntryPoint))
                // 스프링 기본 인증 필터 자리 앞에 우리 JWT 필터를 끼운다
                .addFilterBefore(
                        new JwtAuthenticationFilter(jwtTokenProvider),
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
