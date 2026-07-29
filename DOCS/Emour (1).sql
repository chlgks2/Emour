CREATE TABLE `채팅` (
	`message_id`	int	NOT NULL,
	`user_id`	int	NOT NULL	COMMENT 'auto increment',
	`couple_room_id`	int	NOT NULL,
	`message_type`	enum	NULL,
	`content`	varchar	NULL,
	`read_at`	datetime	NULL,
	`send_at`	datetime	NULL
);

CREATE TABLE `한줄 일기` (
	`diary_id`	int	NOT NULL,
	`user_id`	int	NOT NULL	COMMENT 'auto increment',
	`couple_room_id`	int	NOT NULL,
	`date`	date	NULL,
	`content`	varchar	NULL,
	`created_at`	datetime	NULL,
	`updated_at`	datetime	NULL,
	`deleted_at`	datetime	NULL
);

CREATE TABLE `방` (
	`room_id`	int	NOT NULL,
	`started_at`	date	NULL,
	`room_code`	varchar	NULL,
	`updated_at`	datetime	NULL,
	`alarm_time`	int	NULL,
	`status`	enum	NULL
);

CREATE TABLE `채팅 감정 분석` (
	`message_analysis_id`	int	NOT NULL,
	`message_id`	int	NOT NULL,
	`emotion_type`	varchar	NULL,
	`Field`	VARCHAR(255)	NULL
);

CREATE TABLE `포함된 멤버` (
	`user_id`	int	NOT NULL	COMMENT 'auto increment',
	`couple_room_id`	int	NOT NULL,
	`partner_nick`	varchar	NULL,
	`status`	enum	NULL,
	`matched_at`	date	NULL
);

CREATE TABLE `대시보드 분석` (
	`board_id`	int	NOT NULL,
	`user_id`	int	NOT NULL	COMMENT 'auto increment',
	`couple_room_id`	int	NOT NULL
);

CREATE TABLE `Untitled` (
	`social_id`	int	NOT NULL,
	`user_id`	int	NOT NULL	COMMENT 'auto increment',
	`provider`	char	NULL,
	`provider_id`	char	NULL,
	`created_at`	date	NULL
);

CREATE TABLE `앨범` (
	`photo_id`	int	NOT NULL,
	`user_id`	int	NOT NULL	COMMENT 'auto increment',
	`couple_room_id`	int	NOT NULL,
	`image_url`	varchar	NULL,
	`memo`	varchar	NULL,
	`created_at`	datetime	NULL,
	`updated_at`	datetime	NULL
);

CREATE TABLE `(오늘의) 기분` (
	`mood_id`	int	NOT NULL,
	`user_id`	int	NOT NULL	COMMENT 'auto increment',
	`couple_room_id`	int	NOT NULL,
	`mood_type`	enum	NULL,
	`created_at`	datetime	NULL
);

CREATE TABLE `이메일 인증` (
	`verification_id`	int	NOT NULL,
	`email`	char	NULL,
	`verification_code`	char	NULL,
	`expires_at`	date	NULL,
	`verified_at`	date	NULL,
	`created_at`	date	NULL
);

CREATE TABLE `일정` (
	`schedule_id`	int	NOT NULL,
	`user_id`	int	NOT NULL	COMMENT 'auto increment',
	`couple_room_id`	int	NOT NULL,
	`name`	varchar	NULL,
	`date`	date	NULL,
	`Field`	VARCHAR(255)	NULL,
	`type`	enum	NULL	COMMENT '기념일(ANNIVERSARY) + 사귀기 시작한 날
일반 일정(SCHEDULE)',
	`created_at`	datetime	NULL,
	`updated_at`	datetime	NULL
);

CREATE TABLE `사용자` (
	`user_id`	int	NOT NULL	COMMENT 'auto increment',
	`email`	varchar	NULL,
	`password`	pw	NULL,
	`nickname`	varchar	NULL,
	`birth`	date	NULL,
	`profile_img_url`	varchar	NULL,
	`status_msg`	varchar	NULL,
	`created_at`	datetime	NULL,
	`updated_at`	datetime	NULL,
	`status`	enum	NULL
);

ALTER TABLE `채팅` ADD CONSTRAINT `PK_채팅` PRIMARY KEY (
	`message_id`
);

ALTER TABLE `한줄 일기` ADD CONSTRAINT `PK_한줄 일기` PRIMARY KEY (
	`diary_id`
);

ALTER TABLE `방` ADD CONSTRAINT `PK_방` PRIMARY KEY (
	`room_id`
);

ALTER TABLE `채팅 감정 분석` ADD CONSTRAINT `PK_채팅 감정 분석` PRIMARY KEY (
	`message_analysis_id`
);

ALTER TABLE `포함된 멤버` ADD CONSTRAINT `PK_포함된 멤버` PRIMARY KEY (
	`user_id`,
	`couple_room_id`
);

ALTER TABLE `대시보드 분석` ADD CONSTRAINT `PK_대시보드 분석` PRIMARY KEY (
	`board_id`
);

ALTER TABLE `Untitled` ADD CONSTRAINT `PK_UNTITLED` PRIMARY KEY (
	`social_id`
);

ALTER TABLE `앨범` ADD CONSTRAINT `PK_앨범` PRIMARY KEY (
	`photo_id`
);

ALTER TABLE `(오늘의) 기분` ADD CONSTRAINT `PK_(오늘의) 기분` PRIMARY KEY (
	`mood_id`
);

ALTER TABLE `이메일 인증` ADD CONSTRAINT `PK_이메일 인증` PRIMARY KEY (
	`verification_id`
);

ALTER TABLE `일정` ADD CONSTRAINT `PK_일정` PRIMARY KEY (
	`schedule_id`
);

ALTER TABLE `사용자` ADD CONSTRAINT `PK_사용자` PRIMARY KEY (
	`user_id`
);

ALTER TABLE `포함된 멤버` ADD CONSTRAINT `FK_사용자_TO_포함된 멤버_1` FOREIGN KEY (
	`user_id`
)
REFERENCES `사용자` (
	`user_id`
);

ALTER TABLE `포함된 멤버` ADD CONSTRAINT `FK_방_TO_포함된 멤버_1` FOREIGN KEY (
	`couple_room_id`
)
REFERENCES `방` (
	`room_id`
);

