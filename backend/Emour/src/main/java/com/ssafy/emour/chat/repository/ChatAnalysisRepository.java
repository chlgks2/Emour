package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.ChatAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatAnalysisRepository extends JpaRepository<ChatAnalysis, Long> {

    @Query("""
            select analysis
            from ChatAnalysis analysis
            join fetch analysis.message message
            where message.roomId = :roomId
              and message.senderId = :userId
              and message.sentAt >= :start
              and message.sentAt < :end
              and analysis.analysisStatus =
                  com.ssafy.emour.chat.entity.AnalysisStatus.COMPLETED
            order by message.sentAt asc
            """)
    List<ChatAnalysis> findCompletedDailyAnalyses(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
