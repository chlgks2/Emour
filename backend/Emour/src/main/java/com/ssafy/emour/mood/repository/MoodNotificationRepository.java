package com.ssafy.emour.mood.repository;

import com.ssafy.emour.mood.entity.MoodNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MoodNotificationRepository
        extends JpaRepository<MoodNotification, Long> {

    Optional<MoodNotification> findByRoomIdAndActiveTrue(Long roomId);

    List<MoodNotification> findAllByActiveTrue();
}
