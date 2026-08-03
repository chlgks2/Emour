package com.ssafy.emour.calendar.repository;

import com.ssafy.emour.calendar.entity.CoupleSchedule;
import com.ssafy.emour.calendar.entity.ScheduleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface CoupleScheduleRepository
        extends JpaRepository<CoupleSchedule, Long> {

    List<CoupleSchedule>
    findAllByRoomIdAndScheduleTypeAndScheduleDateBetweenOrderByScheduleDateAscScheduleTimeAsc(
            Long roomId,
            ScheduleType scheduleType,
            LocalDate startDate,
            LocalDate endDate
    );

    List<CoupleSchedule>
    findAllByRoomIdAndScheduleTypeOrderByScheduleDateAsc(
            Long roomId,
            ScheduleType scheduleType
    );
}
