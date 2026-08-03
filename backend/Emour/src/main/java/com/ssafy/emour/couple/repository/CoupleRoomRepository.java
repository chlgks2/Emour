package com.ssafy.emour.couple.repository;

import com.ssafy.emour.couple.entity.CoupleRoom;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CoupleRoomRepository extends JpaRepository<CoupleRoom, Long> {

    boolean existsByRoomCode(String roomCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select cr from CoupleRoom cr where cr.roomCode = :roomCode")
    Optional<CoupleRoom> findByRoomCodeForUpdate(@Param("roomCode") String roomCode);

    @Query("""
            select cr
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and cr.status in (
                  com.ssafy.emour.couple.entity.CoupleRoomStatus.WAITING,
                  com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE,
                  com.ssafy.emour.couple.entity.CoupleRoomStatus.INACTIVE
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
    List<CoupleRoom> findCurrentRoomsByUserId(
            @Param("userId") Long userId,
            Pageable pageable
    );

    @Query("""
            select cr
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
            """)
    Optional<CoupleRoom> findActiveRoomByUserId(@Param("userId") Long userId);

    /**
     * 현재 남아 있는 사용자가 기존 커플 데이터를 조회할 수 있는 방.
     * 상대방이 나간 INACTIVE 방도 읽기 전용 화면에서는 접근을 허용한다.
     */
    @Query("""
            select cr
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and cr.status in (
                  com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE,
                  com.ssafy.emour.couple.entity.CoupleRoomStatus.INACTIVE
              )
            order by
              case
                when cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
                then 0
                else 1
              end,
              cr.updatedAt desc
            """)
    List<CoupleRoom> findReadableRoomsByUserId(
            @Param("userId") Long userId,
            Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select cr
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
            """)
    Optional<CoupleRoom> findActiveRoomByUserIdForUpdate(@Param("userId") Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select cr
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.WAITING
            order by cr.createdAt desc
            """)
    List<CoupleRoom> findWaitingRoomsByUserIdForUpdate(
            @Param("userId") Long userId,
            Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select cr
            from CoupleMember cm
            join CoupleRoom cr on cr.id = cm.id.roomId
            where cm.id.userId = :userId
              and cm.status = com.ssafy.emour.couple.entity.CoupleMemberStatus.ACTIVE
              and cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.INACTIVE
            order by cr.updatedAt desc
            """)
    List<CoupleRoom> findRetainedInactiveRoomsByUserIdForUpdate(
            @Param("userId") Long userId,
            Pageable pageable
    );
}
