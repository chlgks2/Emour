package com.ssafy.emour.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security 기본 설정.
 *
 * 지금은 개발 초기라 "모든 요청 허용(permitAll)" 상태로 열어둔다.
 * -> [3] JWT 단계에서 JWT 인증 필터를 추가하고, 로그인/회원가입 등
 *    일부 경로만 열고 나머지는 인증을 요구하도록 잠글 예정.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // REST API 는 세션/쿠키 기반이 아니므로 CSRF 보호가 불필요
                .csrf(AbstractHttpConfigurer::disable)
                // 스프링 기본 로그인 폼 / 팝업 인증 비활성화 (우리는 JWT 사용)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                // 서버가 세션을 만들지 않는 무상태(STATELESS) 방식
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 현재는 모든 요청 허용 (TODO: JWT 도입 시 경로별로 잠글 것)
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                );
        return http.build();
    }

    /**
     * 비밀번호 암호화기(BCrypt).
     * 회원가입 시 비밀번호를 이걸로 암호화해서 저장하고,
     * 로그인 시 입력 비밀번호와 비교(matches)할 때 사용한다.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
