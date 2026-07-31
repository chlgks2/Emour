package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.AnalysisStatus;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatAnalysisRepository extends JpaRepository<ChatAnalysis, Long> {

    @Query("""
            select analysis
            from ChatAnalysis analysis
            join fetch analysis.message message
            where analysis.analysisStatus = :status
            order by message.sentAt asc, message.messageId asc
            """)
    List<ChatAnalysis> findOldestByStatus(
            @Param("status") AnalysisStatus status,
            Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select analysis
            from ChatAnalysis analysis
            join fetch analysis.message message
            where message.roomId = :roomId
              and analysis.analysisStatus =
                  com.ssafy.emour.chat.entity.AnalysisStatus.PENDING
            order by message.sentAt asc, message.messageId asc
            """)
    List<ChatAnalysis> findPendingTargets(
            @Param("roomId") Long roomId,
            Pageable pageable
    );

    @Query("""
            select analysis
            from ChatAnalysis analysis
            join fetch analysis.message message
            where message.roomId = :roomId
              and analysis.analysisStatus =
                  com.ssafy.emour.chat.entity.AnalysisStatus.COMPLETED
              and (
                    message.sentAt < :targetSentAt
                    or (
                        message.sentAt = :targetSentAt
                        and message.messageId < :targetMessageId
                    )
              )
            order by message.sentAt desc, message.messageId desc
            """)
    List<ChatAnalysis> findRecentContext(
            @Param("roomId") Long roomId,
            @Param("targetSentAt") LocalDateTime targetSentAt,
            @Param("targetMessageId") Long targetMessageId,
            Pageable pageable
    );

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

    @Query("""
            select analysis.emotionType
            from ChatAnalysis analysis
            join analysis.message message
            where message.roomId = :roomId
              and message.senderId = :userId
              and message.sentAt >= :start
              and message.sentAt < :end
              and analysis.analysisStatus =
                  com.ssafy.emour.chat.entity.AnalysisStatus.COMPLETED
            """)
    List<String> findCompletedEmotionTypes(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
