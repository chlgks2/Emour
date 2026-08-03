package com.ssafy.emour.dashboard.repository;

import com.ssafy.emour.dashboard.entity.CoupleDashboard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface CoupleDashboardRepository
        extends JpaRepository<CoupleDashboard, Long> {

    Optional<CoupleDashboard> findByRoomIdAndSummaryDate(
            Long roomId,
            LocalDate summaryDate
    );
}
