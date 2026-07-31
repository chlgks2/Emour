package com.ssafy.emour.calendar.repository;

import com.ssafy.emour.calendar.entity.Diary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface DiaryRepository extends JpaRepository<Diary, Long> {

    boolean existsByRoomIdAndUserIdAndDiaryDate(
            Long roomId,
            Long userId,
            LocalDate diaryDate
    );
}
