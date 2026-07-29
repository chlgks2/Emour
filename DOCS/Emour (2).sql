CREATE TABLE `couple_member` (
	`room_id`	BIGINT	NOT NULL,
	`user_id`	BIGINT	NOT NULL,
	`partner_nickname`	VARCHAR(50)	NULL,
	`alarm_time`	TIME	NULL	COMMENT '사용자 개인 알림 시간',
	`status`	ENUM( 'ACTIVE', 'LEFT' )	NOT NULL	DEFAULT 'ACTIVE',
	`joined_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`left_at`	DATETIME(6)	NULL
);

CREATE TABLE `mood` (
	`mood_id`	BIGINT	NOT NULL,
	`room_id`	BIGINT	NOT NULL,
	`user_id`	BIGINT	NOT NULL,
	`mood_date`	DATE	NOT NULL,
	`mood_type`	ENUM( 'VERY_HAPPY', 'HAPPY', 'NEUTRAL', 'SAD', 'VERY_SAD' )	NOT NULL,
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`updated_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE `email_verification` (
	`verification_id`	BIGINT	NOT NULL,
	`email`	VARCHAR(255)	NOT NULL,
	`verification_code`	VARCHAR(20)	NOT NULL,
	`purpose`	ENUM( 'SIGN_UP', 'PASSWORD_RESET' )	NOT NULL	DEFAULT 'SIGN_UP',
	`expires_at`	DATETIME(6)	NOT NULL,
	`verified_at`	DATETIME(6)	NULL,
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE `chat_reaction` (
	`reaction_id`	BIGINT	NOT NULL,
	`room_id`	BIGINT	NOT NULL,
	`user_id`	BIGINT	NOT NULL,
	`message_id`	BIGINT	NOT NULL,
	`reaction_type`	ENUM( 'LIKE', 'HEART', 'LAUGH', 'SAD' )	NOT NULL,
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`updated_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE `chat_message_image` (
	`image_id`	BIGINT	NOT NULL,
	`message_id`	BIGINT	NOT NULL,
	`image_url`	VARCHAR(2048)	NOT NULL,
	`display_order`	INT	NOT NULL	DEFAULT 1	COMMENT '메시지 안에서 이미지가 보이는 순서',
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE `album_photo` (
	`photo_id`	BIGINT	NOT NULL,
	`room_id`	BIGINT	NOT NULL,
	`uploader_id`	BIGINT	NOT NULL,
	`image_url`	VARCHAR(2048)	NOT NULL,
	`memo`	VARCHAR(500)	NULL,
	`taken_at`	DATETIME(6)	NULL,
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`updated_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`deleted_at`	DATETIME(6)	NULL
);

CREATE TABLE `chat_bookmark` (
	`bookmark_id`	BIGINT	NOT NULL,
	`room_id`	BIGINT	NOT NULL,
	`user_id`	BIGINT	NOT NULL,
	`message_id`	BIGINT	NOT NULL,
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE `couple_room` (
	`room_id`	BIGINT	NOT NULL,
	`room_code`	VARCHAR(32)	NOT NULL,
	`room_code_expires_at`	DATETIME(6)	NULL,
	`started_at`	DATE	NULL	COMMENT '연애 시작일',
	`status`	ENUM( 'WAITING', 'ACTIVE', 'INACTIVE' )	NOT NULL	DEFAULT 'WAITING',
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`updated_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`ended_at`	DATETIME(6)	NULL
);

CREATE TABLE `couple_schedule` (
	`schedule_id`	BIGINT	NOT NULL,
	`room_id`	BIGINT	NOT NULL,
	`creator_id`	BIGINT	NOT NULL,
	`name`	VARCHAR(100)	NOT NULL,
	`description`	VARCHAR(1000)	NULL,
	`schedule_date`	DATE	NOT NULL,
	`schedule_time`	TIME	NULL,
	`schedule_type`	ENUM( 'ANNIVERSARY', 'SCHEDULE' )	NOT NULL,
	`yearly_recurring`	BOOLEAN	NOT NULL	DEFAULT FALSE,
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`updated_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`deleted_at`	DATETIME(6)	NULL
);

CREATE TABLE `chat_read_state` (
	`room_id`	BIGINT	NOT NULL,
	`user_id`	BIGINT	NOT NULL,
	`last_read_message_id`	BIGINT	NULL,
	`read_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE `chat_analysis` (
	`message_analysis_id`	BIGINT	NOT NULL,
	`message_id`	BIGINT	NOT NULL,
	`emotion_type`	VARCHAR(20)	NULL	COMMENT 'JOY, SADNESS, ANGER 등 대표 감정',
	`analysis_status`	ENUM( 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED' )	NOT NULL	DEFAULT 'PENDING',
	`analyzed_at`	DATETIME(6)	NULL,
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE `diary` (
	`diary_id`	BIGINT	NOT NULL,
	`room_id`	BIGINT	NOT NULL,
	`user_id`	BIGINT	NOT NULL,
	`diary_date`	DATE	NOT NULL,
	`content`	VARCHAR(500)	NOT NULL,
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`updated_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`deleted_at`	DATETIME(6)	NULL
);

CREATE TABLE `app_user` (
	`user_id`	BIGINT	NOT NULL,
	`password_hash`	VARCHAR(255)	NULL	COMMENT '소셜 로그인 사용자는 NULL 가능',
	`email`	VARCHAR(255)	NOT NULL	COMMENT 'UNIQUE 제약',
	`nickname`	VARCHAR(50)	NOT NULL,
	`birth`	DATE	NULL,
	`profile_image_url`	VARCHAR(2048)	NULL,
	`status_message`	VARCHAR(255)	NULL,
	`status`	ENUM( 'ACTIVE', 'INACTIVE', 'WITHDRAWN' )	NOT NULL	DEFAULT 'ACTIVE',
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`updated_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`deleted_at`	DATETIME(6)	NULL,
	`is_email_verified`	ENUM	NULL
);

CREATE TABLE `dashboard_daily` (
	`dashboard_id`	BIGINT	NOT NULL,
	`room_id`	BIGINT	NOT NULL,
	`user_id`	BIGINT	NOT NULL,
	`summary_date`	DATE	NOT NULL,
	`message_count`	INT	NOT NULL	DEFAULT 0,
	`image_count`	INT	NOT NULL	DEFAULT 0,
	`reaction_count`	INT	NOT NULL	DEFAULT 0,
	`bookmark_count`	INT	NOT NULL	DEFAULT 0,
	`average_response_seconds`	DECIMAL(12, 2)	NULL,
	`busiest_hour`	TINYINT	NULL	COMMENT '대화가 가장 활발했던 시간, 0부터 23',
	`emotion_summary`	JSON	NULL	COMMENT '{"JOY":3,"NEUTRAL":5} 형식',
	`emotion_flow`	JSON	NULL	COMMENT '2시간 단위 감정 흐름 결과',
	`frequent_words`	JSON	NULL	COMMENT '{"word":"사랑","count":5} 형식',
	`calculated_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6),
	`updated_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE `chat_message` (
	`message_id`	BIGINT	NOT NULL,
	`room_id`	BIGINT	NOT NULL,
	`sender_id`	BIGINT	NOT NULL,
	`client_message_id`	CHAR(36)	NOT NULL	COMMENT '프론트에서 생성한 중복 전송 방지용 UUID',
	`message_type`	ENUM( 'TEXT', 'IMAGE' )	NOT NULL	DEFAULT 'TEXT',
	`content`	VARCHAR(2000)	NULL	COMMENT '텍스트 내용 또는 이미지 설명',
	`sent_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE `social_login` (
	`social_id`	BIGINT	NOT NULL,
	`user_id`	BIGINT	NOT NULL	COMMENT 'UNIQUE',
	`provider`	VARCHAR(30)	NOT NULL	COMMENT 'GOOGLE, KAKAO, NAVER 등',
	`provider_id`	VARCHAR(255)	NOT NULL,
	`created_at`	DATETIME(6)	NOT NULL	DEFAULT CURRENT_TIMESTAMP(6)
);

ALTER TABLE `couple_member` ADD CONSTRAINT `PK_COUPLE_MEMBER` PRIMARY KEY (
	`room_id`,
	`user_id`
);

ALTER TABLE `mood` ADD CONSTRAINT `PK_MOOD` PRIMARY KEY (
	`mood_id`
);

ALTER TABLE `email_verification` ADD CONSTRAINT `PK_EMAIL_VERIFICATION` PRIMARY KEY (
	`verification_id`
);

ALTER TABLE `chat_reaction` ADD CONSTRAINT `PK_CHAT_REACTION` PRIMARY KEY (
	`reaction_id`
);

ALTER TABLE `chat_message_image` ADD CONSTRAINT `PK_CHAT_MESSAGE_IMAGE` PRIMARY KEY (
	`image_id`
);

ALTER TABLE `album_photo` ADD CONSTRAINT `PK_ALBUM_PHOTO` PRIMARY KEY (
	`photo_id`
);

ALTER TABLE `chat_bookmark` ADD CONSTRAINT `PK_CHAT_BOOKMARK` PRIMARY KEY (
	`bookmark_id`
);

ALTER TABLE `couple_room` ADD CONSTRAINT `PK_COUPLE_ROOM` PRIMARY KEY (
	`room_id`
);

ALTER TABLE `couple_schedule` ADD CONSTRAINT `PK_COUPLE_SCHEDULE` PRIMARY KEY (
	`schedule_id`
);

ALTER TABLE `chat_read_state` ADD CONSTRAINT `PK_CHAT_READ_STATE` PRIMARY KEY (
	`room_id`,
	`user_id`
);

ALTER TABLE `chat_analysis` ADD CONSTRAINT `PK_CHAT_ANALYSIS` PRIMARY KEY (
	`message_analysis_id`
);

ALTER TABLE `diary` ADD CONSTRAINT `PK_DIARY` PRIMARY KEY (
	`diary_id`
);

ALTER TABLE `app_user` ADD CONSTRAINT `PK_APP_USER` PRIMARY KEY (
	`user_id`
);

ALTER TABLE `dashboard_daily` ADD CONSTRAINT `PK_DASHBOARD_DAILY` PRIMARY KEY (
	`dashboard_id`
);

ALTER TABLE `chat_message` ADD CONSTRAINT `PK_CHAT_MESSAGE` PRIMARY KEY (
	`message_id`
);

ALTER TABLE `social_login` ADD CONSTRAINT `PK_SOCIAL_LOGIN` PRIMARY KEY (
	`social_id`
);

ALTER TABLE `couple_member` ADD CONSTRAINT `FK_couple_room_TO_couple_member_1` FOREIGN KEY (
	`room_id`
)
REFERENCES `couple_room` (
	`room_id`
);

ALTER TABLE `couple_member` ADD CONSTRAINT `FK_app_user_TO_couple_member_1` FOREIGN KEY (
	`user_id`
)
REFERENCES `app_user` (
	`user_id`
);

ALTER TABLE `chat_read_state` ADD CONSTRAINT `FK_chat_message_TO_chat_read_state_1` FOREIGN KEY (
	`room_id`
)
REFERENCES `chat_message` (
	`room_id`
);

ALTER TABLE `chat_read_state` ADD CONSTRAINT `FK_couple_member_TO_chat_read_state_1` FOREIGN KEY (
	`user_id`
)
REFERENCES `couple_member` (
	`user_id`
);

