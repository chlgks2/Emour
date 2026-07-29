package com.ssafy.emour.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_analysis")
public class ChatAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_analysis_id")
    private Long messageAnalysisId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false, unique = true)
    private ChatMessage message;

    @Column(name = "emotion_type", length = 50)
    private String emotionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_status", nullable = false, length = 20)
    private AnalysisStatus analysisStatus;

    @Column(name = "analyzed_at")
    private LocalDateTime analyzedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ChatAnalysis() {
    }

    public static ChatAnalysis pending(ChatMessage message) {
        ChatAnalysis analysis = new ChatAnalysis();
        analysis.message = message;
        analysis.analysisStatus = AnalysisStatus.PENDING;
        analysis.createdAt = LocalDateTime.now();
        return analysis;
    }
}
