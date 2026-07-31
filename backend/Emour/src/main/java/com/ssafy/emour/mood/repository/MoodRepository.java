package com.ssafy.emour.mood.repository;

import com.ssafy.emour.mood.entity.Mood;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface MoodRepository extends JpaRepository<Mood, Long> {

    boolean existsByRoomIdAndUserIdAndMoodDatetime(
            Long roomId,
            Long userId,
            LocalDateTime moodDatetime
    );

    List<Mood> findAllByRoomIdOrderByMoodDatetimeDescUserIdAsc(Long roomId);
}
