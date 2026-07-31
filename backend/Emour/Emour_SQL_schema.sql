-- MySQL 8.4.7
-- DATABASE 생성
CREATE DATABASE IF NOT EXISTS `emour`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE `emour`;

CREATE TABLE `app_user` (
    `user_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NULL ,
    `nickname` VARCHAR(50) NOT NULL,
    `birth` DATE NULL,
    `profile_image_url` VARCHAR(2048) NULL,
    `status_message` VARCHAR(255) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    `is_email_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `deleted_at` DATETIME(6) NULL
);

CREATE TABLE `social_login` (
    `social_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL UNIQUE,
    -- GOOGLE / KAKAO
    `provider` VARCHAR(30) NOT NULL,
    `provider_id` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE (`provider`, `provider_id`),
    FOREIGN KEY (`user_id`) REFERENCES `app_user` (`user_id`) ON DELETE CASCADE
);

CREATE TABLE `email_verification` (
    `verification_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL,
    `verification_code` VARCHAR(20) NOT NULL,
    `purpose` ENUM('SIGN_UP', 'PASSWORD_RESET') NOT NULL DEFAULT 'SIGN_UP',
    `expires_at` DATETIME(6) NOT NULL,
    `verified_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)

);

CREATE TABLE `couple_room` (
    `room_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_code` VARCHAR(32) NOT NULL UNIQUE,
    `room_code_expires_at` DATETIME(6) NULL,
    `dating_start_date` DATE NULL,
    `status` ENUM('WAITING', 'ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'WAITING',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE TABLE `mood_notification` (
    `room_id` BIGINT NOT NULL PRIMARY KEY,
    `start_time` TIME NOT NULL,
    `end_time` TIME NOT NULL,
    -- 알람 간격
    `interval_hours` TINYINT UNSIGNED NOT NULL,
    -- 알람 활성화
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

    FOREIGN KEY (`room_id`) REFERENCES `couple_room` (`room_id`) ON DELETE CASCADE,
    CHECK (`interval_hours` BETWEEN 1 AND 24),
    CHECK (`start_time` <> `end_time`)
);

CREATE TABLE `home_image_setting` (
    `room_id` BIGINT NOT NULL PRIMARY KEY,
    `image_url` VARCHAR(2048) NULL,
    `text_size` ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL DEFAULT 'MEDIUM',
    `text_alignment` ENUM('LEFT', 'CENTER', 'RIGHT') NOT NULL DEFAULT 'LEFT',
    `background_style` ENUM('TRANSLUCENT', 'DARK', 'NONE') NOT NULL DEFAULT 'TRANSLUCENT',
    `text_color` ENUM('WHITE', 'BLACK') NOT NULL DEFAULT 'WHITE',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    FOREIGN KEY (`room_id`) REFERENCES `couple_room` (`room_id`) ON DELETE CASCADE
);

CREATE TABLE `couple_member` (
    `room_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `partner_nickname` VARCHAR(50) NULL,
    `status` ENUM('ACTIVE', 'LEFT') NOT NULL DEFAULT 'ACTIVE',
    `joined_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `left_at` DATETIME(6) NULL,

    PRIMARY KEY (`room_id`, `user_id`),
    -- 방을 완전히 삭제하면 방에 포함된 멤버도 함께 삭제합니다.
    FOREIGN KEY (`room_id`) REFERENCES `couple_room` (`room_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `app_user` (`user_id`)
);

CREATE TABLE `album_photo` (
    `photo_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_id` BIGINT NOT NULL,
    `uploader_id` BIGINT NOT NULL,
    `image_url` VARCHAR(2048) NOT NULL,
    `memo` VARCHAR(500) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    FOREIGN KEY (`room_id`, `uploader_id`) REFERENCES `couple_member` (`room_id`, `user_id`)
        ON DELETE CASCADE
);

CREATE TABLE `diary` (
    `diary_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `diary_date` DATE NOT NULL,
    `content` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    UNIQUE (`room_id`, `user_id`, `diary_date`),
    FOREIGN KEY (`room_id`, `user_id`) REFERENCES `couple_member` (`room_id`, `user_id`)
        ON DELETE CASCADE
);

CREATE TABLE `mood` (
    `mood_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `mood_datetime` DATETIME(6) NOT NULL,
    `mood_type` ENUM('VERY_HAPPY', 'HAPPY', 'NEUTRAL', 'SAD', 'VERY_SAD')
        NOT NULL DEFAULT 'NEUTRAL',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    UNIQUE (`room_id`, `user_id`, `mood_datetime`),
    FOREIGN KEY (`room_id`, `user_id`) REFERENCES `couple_member` (`room_id`, `user_id`)
        ON DELETE CASCADE
);

CREATE TABLE `couple_schedule` (
    `schedule_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_id` BIGINT NOT NULL,
    `creator_id` BIGINT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `schedule_date` DATE NOT NULL,
    `schedule_time` TIME NULL,
    `schedule_type` ENUM('ANNIVERSARY', 'SCHEDULE') NOT NULL,
    `yearly_recurring` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    FOREIGN KEY (`room_id`, `creator_id`) REFERENCES `couple_member` (`room_id`, `user_id`)
        ON DELETE CASCADE
);

CREATE TABLE `dashboard` (
    `dashboard_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `summary_date` DATE NOT NULL,
    -- 하루 동안 이 사용자가 보낸 메시지 개수
    `message_count` INT NOT NULL DEFAULT 0,
    -- 하루 동안 이 사용자가 보낸 이미지 개수
    `image_count` INT NOT NULL DEFAULT 0,
    -- 하루 동안 이 사용자가 메시지에 남긴 공감 및 반응 개수
    `reaction_count` INT NOT NULL DEFAULT 0,
    -- 하루 동안 이 사용자가 저장한 북마크 메시지 개수
    `bookmark_count` INT NOT NULL DEFAULT 0,
    `average_response_seconds` DECIMAL(12, 2) NULL,
    -- 대화가 가장 활발했던 시간 (0 ~ 23)
    `busiest_hour` TINYINT UNSIGNED NULL,
    -- 날짜별 커플 전체 메시지 개수
    `conversation_frequency` JSON NULL,
    -- '{"JOY":3,"NEUTRAL":5} 형식'
    `emotion_summary` JSON NULL,
    -- '2시간 단위 감정 흐름 결과'
    `emotion_flow` JSON NULL,
    -- '[{"word":"사랑","count":5}] 형식'
    `frequent_words` JSON NULL,
    -- 이 시각 직전까지 1차 집계가 완료됨
    `aggregated_until` DATETIME(6) NULL,
    -- 이 시각 직전까지 5분 후 최종 집계가 완료됨
    `finalized_until` DATETIME(6) NULL,
    `calculated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    UNIQUE (`room_id`, `user_id`, `summary_date`),
    CHECK (`busiest_hour` IS NULL OR `busiest_hour` BETWEEN 0 AND 23),
    FOREIGN KEY (`room_id`, `user_id`) REFERENCES `couple_member` (`room_id`, `user_id`)
        ON DELETE CASCADE
);

CREATE TABLE `chat_message` (
    `message_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_id` BIGINT NOT NULL,
    `sender_id` BIGINT NOT NULL,
    -- 클라이언트에서 생성한 중복 전송 방지용 UUID
    `client_message_id` CHAR(36) NOT NULL,
    `message_type` ENUM('TEXT', 'IMAGE') NOT NULL DEFAULT 'TEXT',
    -- 텍스트 내용 또는 이미지 설명
    `content` VARCHAR(2000) NULL,
    `sent_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE (`sender_id`, `client_message_id`),
    UNIQUE (`message_id`, `room_id`),
    FOREIGN KEY (`room_id`, `sender_id`) REFERENCES `couple_member` (`room_id`, `user_id`)
        ON DELETE CASCADE
);

CREATE TABLE `chat_message_image` (
    `image_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `message_id` BIGINT NOT NULL,
    `image_url` VARCHAR(2048) NOT NULL,
    -- '메시지 안에서 이미지가 보이는 순서'
    `display_order` INT NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE (`message_id`, `display_order`),
    CHECK (`display_order` >= 1),
    FOREIGN KEY (`message_id`) REFERENCES `chat_message` (`message_id`) ON DELETE CASCADE
);

CREATE TABLE `chat_read_state` (
    `room_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `last_read_message_id` BIGINT NULL,
    `read_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`room_id`, `user_id`),
    FOREIGN KEY (`room_id`, `user_id`) REFERENCES `couple_member` (`room_id`, `user_id`)
        ON DELETE CASCADE,
    -- 개별 메시지가 삭제되면 읽음 위치만 비우고 읽음 상태 행은 유지합니다.
    FOREIGN KEY (`last_read_message_id`) REFERENCES `chat_message` (`message_id`)
        ON DELETE SET NULL
);

CREATE TABLE `chat_bookmark` (
    `bookmark_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `message_id` BIGINT NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE (`user_id`, `message_id`),
    FOREIGN KEY (`room_id`, `user_id`) REFERENCES `couple_member` (`room_id`, `user_id`)
        ON DELETE CASCADE,
    FOREIGN KEY (`message_id`, `room_id`) REFERENCES `chat_message` (`message_id`, `room_id`)
        ON DELETE CASCADE
);

CREATE TABLE `chat_reaction` (
    `reaction_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `message_id` BIGINT NOT NULL,
    `reaction_type` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE (`user_id`, `message_id`),
    FOREIGN KEY (`room_id`, `user_id`) REFERENCES `couple_member` (`room_id`, `user_id`)
        ON DELETE CASCADE,
    FOREIGN KEY (`message_id`, `room_id`) REFERENCES `chat_message` (`message_id`, `room_id`)
        ON DELETE CASCADE
);

CREATE TABLE `chat_analysis` (
    `message_analysis_id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `message_id` BIGINT NOT NULL UNIQUE,
    -- 영어 감정으로 전달될 것
    `emotion_type`
        ENUM(
            -- 긍정 감정
            'JOY',
            'EXCITEMENT',
            'COMFORT',
            -- 중립 감정
            'WORRY',
            'SURPRISE',
            'NEUTRAL',
            'EMBARRASSMENT',
            'CURIOSITY',
            -- 부정 감정
            'SADNESS',
            'ANGER',
            'CONFUSION',
            'DISTRESS',
            -- 관계 신호
            'GRATITUDE',
            'APOLOGY',
            'HURT'
            )
        NULL,
    `analysis_status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
        NOT NULL DEFAULT 'PENDING',
    `analyzed_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    FOREIGN KEY (`message_id`) REFERENCES `chat_message` (`message_id`) ON DELETE CASCADE
);
