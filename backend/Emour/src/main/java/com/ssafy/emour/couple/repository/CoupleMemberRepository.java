package com.ssafy.emour.couple.repository;

import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.entity.CoupleRoom;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CoupleMemberRepository extends JpaRepository<CoupleMember, CoupleMemberId> {

    // 로그인한 회원의 현재 활성 커플룸 id (앨범/무드 등 다른 도메인에서 방 기준 조회용, 읽기전용)
    @Query("""
            select cm.id.roomId
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
            """)
    Optional<Long> findActiveRoomIdByUserId(@Param("userId") Long userId);

    // 채팅에서는 해당 사용자가 현재 방의 활성 멤버인지 확인합니다.
    boolean existsByIdAndStatus(CoupleMemberId id, CoupleMemberStatus status);

    long countByIdRoomIdAndStatus(
            Long roomId,
            CoupleMemberStatus status
    );

    List<CoupleMember> findAllByIdRoomId(Long roomId);

    @Query("""
            select (count(cm) > 0)
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
            """)
    boolean existsActiveCoupleByUserId(@Param("userId") Long userId);

    @Query("""
            select cm.id.roomId
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and (
                    cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
                    or (
                        cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.WAITING
                        and cr.roomCodeExpiresAt > :currentTime
                    )
              )
            order by
              case
                  when cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
                  then 0
                  else 1
              end,
              cr.createdAt desc
            """)
    List<Long> findCurrentRoomIdsByUserId(
            @Param("userId") Long userId,
            @Param("currentTime") LocalDateTime currentTime,
            Pageable pageable
    );

    @Query("""
            select cr
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.WAITING
            order by cr.createdAt desc
            """)
    List<CoupleRoom> findWaitingRoomsByUserId(
            @Param("userId") Long userId,
            Pageable pageable
    );
}