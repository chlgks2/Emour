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

public interface CoupleMemberRepository extends JpaRepository<CoupleMember, CoupleMemberId> {

    // 채팅에서는 해당 사용자가 현재 방의 활성 멤버인지 확인합니다.
    boolean existsByIdAndStatus(CoupleMemberId id, CoupleMemberStatus status);

    long countByIdRoomIdAndStatus(
            Long roomId,
            CoupleMemberStatus status
    );

    List<CoupleMember> findAllByIdRoomId(Long roomId);

    List<CoupleMember> findAllByStatus(CoupleMemberStatus status);

    @Query("""
            select partner.id.userId
            from CoupleMember member
            join CoupleRoom room on room.id = member.id.roomId
            join CoupleMember partner
              on partner.id.roomId = member.id.roomId
            where member.id.userId = :userId
              and member.status =
                  com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and partner.id.userId <> :userId
              and partner.status =
                  com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and room.status =
                  com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
            order by room.updatedAt desc
            """)
    List<Long> findActivePartnerUserIds(
            @Param("userId") Long userId,
            Pageable pageable
    );

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
            select (count(cm) > 0)
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.INACTIVE
            """)
    boolean existsRetainedInactiveRoomByUserId(@Param("userId") Long userId);

    @Query("""
            select cm.id.roomId
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and (
                    cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
                    or cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.INACTIVE
                    or (
                        cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.WAITING
                        and cr.roomCodeExpiresAt > :currentTime
                    )
              )
            order by
              case
                  when cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
                  then 0
                  when cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.WAITING
                  then 1
                  else 2
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
