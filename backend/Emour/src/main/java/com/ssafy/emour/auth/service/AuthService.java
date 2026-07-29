package com.ssafy.emour.auth.service;

import com.ssafy.emour.auth.dto.request.SignUpRequest;
import com.ssafy.emour.auth.dto.response.SignUpResponse;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.entity.Member;
import com.ssafy.emour.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 인증 관련 비즈니스 로직.
 *
 * @Service               : "이 클래스는 서비스 계층의 스프링 빈이다"
 * @RequiredArgsConstructor: final 필드를 받는 생성자를 자동 생성 → 스프링이 필요한 객체를
 *                           알아서 넣어준다(의존성 주입, DI). new 로 직접 만들 필요가 없다.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final MemberRepository memberRepository;   // DB 접근 (스프링이 주입)
    private final PasswordEncoder passwordEncoder;     // BCrypt (SecurityConfig 에서 등록한 빈)

    /**
     * 이메일 회원가입.
     * @Transactional : 이 메서드 안의 DB 작업을 하나의 트랜잭션으로 묶는다.
     *                  중간에 예외가 나면 저장을 자동 롤백해 데이터 정합성을 지킨다.
     */
    @Transactional
    public SignUpResponse signUp(SignUpRequest request) {
        // 1) 이메일 중복 검사 — 이미 있으면 예외를 던진다(핸들러가 409 응답으로 변환)
        if (memberRepository.existsByEmail(request.email())) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        // 2) 비밀번호를 절대 평문으로 저장하지 않는다 — BCrypt 로 해시
        String encodedPassword = passwordEncoder.encode(request.password());

        // 3) 회원 엔티티 생성 후 저장 (save 가 INSERT SQL 을 실행하고, id 가 채워진다)
        Member member = Member.builder()
                .email(request.email())
                .passwordHash(encodedPassword)
                .nickname(request.nickname())
                .build();
        Member saved = memberRepository.save(member);

        // 4) 엔티티를 그대로 반환하지 않고, 안전한 응답 DTO 로 변환해 반환
        return SignUpResponse.from(saved);
    }

    /**
     * 이메일 사용 가능 여부(중복확인).
     * readOnly = true : 조회만 하므로 읽기 전용 트랜잭션(약간의 성능 이점 + 실수로 쓰기 방지)
     * @return 사용 가능하면 true, 이미 쓰이는 이메일이면 false
     */
    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        return !memberRepository.existsByEmail(email);
    }
}
