package com.ssafy.emour.mood.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "mood")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Mood {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "mood_id")
    private Long id;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "mood_datetime", nullable = false)
    private LocalDateTime moodDatetime;

    @Enumerated(EnumType.STRING)
    @Column(name = "mood_type", nullable = false, length = 20)
    private MoodType moodType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static Mood create(
            Long roomId,
            Long userId,
            LocalDateTime moodDatetime,
            MoodType moodType,
            LocalDateTime createdAt
    ) {
        Mood mood = new Mood();
        mood.roomId = roomId;
        mood.userId = userId;
        mood.moodDatetime = moodDatetime;
        mood.moodType = moodType;
        mood.createdAt = createdAt;
        mood.updatedAt = createdAt;
        return mood;
    }

    public static Mood createDefault(
            Long roomId,
            Long userId,
            LocalDateTime moodDatetime,
            LocalDateTime createdAt
    ) {
        return create(
                roomId,
                userId,
                moodDatetime,
                MoodType.NEUTRAL,
                createdAt
        );
    }
}
