package com.ssafy.emour.couple.repository;

import com.ssafy.emour.couple.entity.CoupleRoom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoupleRoomRepository extends JpaRepository<CoupleRoom, Long> {

    boolean existsByRoomCode(String roomCode);
}
