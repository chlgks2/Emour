package com.ssafy.emour.couple.repository;

import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoupleMemberRepository extends JpaRepository<CoupleMember, CoupleMemberId> {

    boolean existsByIdAndStatus(CoupleMemberId id, CoupleMemberStatus status);
}
