package com.ssafy.emour.couple.repository;

import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.entity.CoupleRoom;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CoupleMemberRepository extends JpaRepository<CoupleMember, CoupleMemberId> {

    long countByIdRoomIdAndStatus(
            Long roomId,
            CoupleMemberStatus status
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
