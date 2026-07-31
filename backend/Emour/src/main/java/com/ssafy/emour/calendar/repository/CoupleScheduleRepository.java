package com.ssafy.emour.calendar.repository;

import com.ssafy.emour.calendar.entity.CoupleSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoupleScheduleRepository
        extends JpaRepository<CoupleSchedule, Long> {
}
