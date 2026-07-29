package com.ssafy.emour.member.repository;

import com.ssafy.emour.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 회원 DB 접근 계층.
 *
 * JpaRepository<Member, Long> 를 상속하면
 * save(), findById(), delete() 같은 기본 CRUD 메서드가 이미 다 제공된다.
 * (구현체는 스프링이 실행 시점에 자동 생성 — 우리는 인터페이스만 선언!)
 *
 * 아래 두 메서드는 "메서드 이름"만 규칙에 맞게 지으면
 * 스프링이 이름을 해석해 알맞은 SQL 을 자동으로 만들어 준다.
 */
public interface MemberRepository extends JpaRepository<Member, Long> {

    // SELECT ... WHERE email = ? 의 존재 여부 → 이메일 중복확인(USER-002)에 사용
    boolean existsByEmail(String email);

    // SELECT ... WHERE email = ? → 로그인 시 이메일로 회원을 찾을 때 사용
    // 없을 수도 있으므로 Optional 로 감싸서 반환
    Optional<Member> findByEmail(String email);
}
