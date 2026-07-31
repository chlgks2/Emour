package com.ssafy.emour.mood.repository;

import com.ssafy.emour.mood.entity.MoodNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MoodNotificationRepository
        extends JpaRepository<MoodNotification, Long> {

    Optional<MoodNotification> findByRoomIdAndActiveTrue(Long roomId);

}
