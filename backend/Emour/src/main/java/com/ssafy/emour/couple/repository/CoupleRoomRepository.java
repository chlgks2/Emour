package com.ssafy.emour.couple.repository;

import com.ssafy.emour.couple.entity.CoupleRoom;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CoupleRoomRepository extends JpaRepository<CoupleRoom, Long> {

    boolean existsByRoomCode(String roomCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select cr from CoupleRoom cr where cr.roomCode = :roomCode")
    Optional<CoupleRoom> findByRoomCodeForUpdate(@Param("roomCode") String roomCode);
}
