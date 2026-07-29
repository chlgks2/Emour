package com.ssafy.emour.global.config;

import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * 로컬 연습 환경에서만 사용하는 채팅 테스트 데이터입니다.
 * mysql 프로필에서는 실행되지 않으므로 실제 DB에는 영향을 주지 않습니다.
 */
@Configuration
@Profile("local")
public class LocalChatSampleDataConfig {

    @Bean
    public CommandLineRunner createLocalChatMembers(
            CoupleMemberRepository coupleMemberRepository
    ) {
        return args -> {
            // 1번 방에서 1번 사용자와 2번 사용자가 대화할 수 있게 준비합니다.
            saveMemberIfMissing(coupleMemberRepository, 1L, 1L);
            saveMemberIfMissing(coupleMemberRepository, 2L, 1L);
        };
    }

    private void saveMemberIfMissing(
            CoupleMemberRepository repository,
            Long userId,
            Long roomId
    ) {
        CoupleMemberId memberId = new CoupleMemberId(userId, roomId);
        if (!repository.existsById(memberId)) {
            repository.save(CoupleMember.active(userId, roomId));
        }
    }
}
