package com.ssafy.emour.couple.repository;

import com.ssafy.emour.couple.entity.CoupleRoom;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

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
                  com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
              )
            order by
              case
                when cr.status = com.ssafy.emour.couple.entity.CoupleRoomStatus.ACTIVE
                then 0
                else 1
              end,
              cr.createdAt desc
            """)
    List<CoupleRoom> findCurrentRoomsByUserId(
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
