-- =========================================================
-- 대시보드 Swagger 테스트용 더미 데이터
-- 대상 사용자: user_id = 21
--
-- 실행 전 조건
-- 1. 21번 사용자가 존재해야 합니다.
-- 2. 21번 사용자가 ACTIVE 상태로 참여한 커플방이 있어야 합니다.
-- 3. 같은 방에 ACTIVE 상태인 상대방 한 명이 있어야 합니다.
--
-- 주의: 테이블 구조를 만드는 DDL이 아니라 데이터를 넣는 DML입니다.
-- 동일한 스크립트를 다시 실행해도 테스트 메시지가 중복되지 않습니다.
-- =========================================================

USE `emour`;

SET @target_user_id = 21;
SET @test_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

-- 21번 사용자가 가장 최근에 참여한 활성 커플방을 찾습니다.
SET @room_id = (
    SELECT member.`room_id`
    FROM `couple_member` member
    JOIN `couple_room` room
      ON room.`room_id` = member.`room_id`
    WHERE member.`user_id` = @target_user_id
      AND member.`status` = 'ACTIVE'
      AND room.`status` = 'ACTIVE'
      AND EXISTS (
          SELECT 1
          FROM `couple_member` partner
          WHERE partner.`room_id` = member.`room_id`
            AND partner.`user_id` <> @target_user_id
            AND partner.`status` = 'ACTIVE'
      )
    ORDER BY member.`joined_at` DESC
    LIMIT 1
);

-- 같은 방에 있는 상대방을 찾습니다.
SET @partner_id = (
    SELECT `user_id`
    FROM `couple_member`
    WHERE `room_id` = @room_id
      AND `user_id` <> @target_user_id
      AND `status` = 'ACTIVE'
    ORDER BY `joined_at`
    LIMIT 1
);

-- room_id 또는 partner_id가 NULL이면 위의 실행 전 조건을 먼저 확인해야 합니다.
SELECT
    @target_user_id AS `target_user_id`,
    @room_id AS `room_id`,
    @partner_id AS `partner_id`,
    @test_date AS `swagger_test_date`;

START TRANSACTION;

-- ---------------------------------------------------------
-- 1. 채팅 메시지
-- 어제 21시에 메시지를 몰아 넣어 가장 활발한 시간이 21시가 되게 합니다.
-- 지난 날짜에도 메시지를 넣어 월/년 단위 날짜별 빈도를 확인할 수 있습니다.
-- ---------------------------------------------------------
INSERT INTO `chat_message` (
    `room_id`,
    `sender_id`,
    `client_message_id`,
    `message_type`,
    `content`,
    `sent_at`
)
VALUES
    (
        @room_id, @target_user_id,
        'd0000021-0000-0000-0000-000000000001',
        'TEXT', '오늘 사랑 사랑 데이트 기대돼',
        TIMESTAMP(@test_date, '08:00:00')
    ),
    (
        @room_id, @partner_id,
        'd0000021-0000-0000-0000-000000000002',
        'TEXT', '좋아 오늘 같이 맛있는 거 먹자',
        TIMESTAMP(@test_date, '08:02:00')
    ),
    (
        @room_id, @target_user_id,
        'd0000021-0000-0000-0000-000000000003',
        'TEXT', '몇 시에 만날까 궁금해',
        TIMESTAMP(@test_date, '09:30:00')
    ),
    (
        @room_id, @partner_id,
        'd0000021-0000-0000-0000-000000000004',
        'TEXT', '저녁 아홉 시에 만나자',
        TIMESTAMP(@test_date, '09:35:00')
    ),
    (
        @room_id, @target_user_id,
        'd0000021-0000-0000-0000-000000000005',
        'TEXT', '드디어 만났다 너무 설레고 기뻐',
        TIMESTAMP(@test_date, '21:00:00')
    ),
    (
        @room_id, @partner_id,
        'd0000021-0000-0000-0000-000000000006',
        'TEXT', '나도 정말 보고 싶었어',
        TIMESTAMP(@test_date, '21:01:30')
    ),
    (
        @room_id, @target_user_id,
        'd0000021-0000-0000-0000-000000000007',
        'TEXT', '오늘 사진도 많이 찍자 사랑해',
        TIMESTAMP(@test_date, '21:03:00')
    ),
    (
        @room_id, @target_user_id,
        'd0000021-0000-0000-0000-000000000008',
        'IMAGE', NULL,
        TIMESTAMP(@test_date, '21:10:00')
    ),
    (
        @room_id, @partner_id,
        'd0000021-0000-0000-0000-000000000009',
        'TEXT', '사진 너무 예쁘게 나왔다',
        TIMESTAMP(@test_date, '21:15:00')
    ),
    (
        @room_id, @target_user_id,
        'd0000021-0000-0000-0000-000000000010',
        'TEXT', '오늘 하루 정말 행복했어',
        TIMESTAMP(@test_date, '21:20:00')
    ),
    (
        @room_id, @target_user_id,
        'd0000021-0000-0000-0000-000000000011',
        'TEXT', '요즘 조금 걱정이 많았는데 고마워',
        TIMESTAMP(DATE_SUB(@test_date, INTERVAL 1 DAY), '18:00:00')
    ),
    (
        @room_id, @partner_id,
        'd0000021-0000-0000-0000-000000000012',
        'TEXT', '괜찮아 언제든 이야기해 줘',
        TIMESTAMP(DATE_SUB(@test_date, INTERVAL 1 DAY), '18:05:00')
    ),
    (
        @room_id, @target_user_id,
        'd0000021-0000-0000-0000-000000000013',
        'TEXT', '미안해 다음에는 더 일찍 연락할게',
        TIMESTAMP(DATE_SUB(@test_date, INTERVAL 2 DAY), '13:00:00')
    ),
    (
        @room_id, @partner_id,
        'd0000021-0000-0000-0000-000000000014',
        'TEXT', '괜찮아 이해해',
        TIMESTAMP(DATE_SUB(@test_date, INTERVAL 2 DAY), '13:03:00')
    ),
    (
        @room_id, @target_user_id,
        'd0000021-0000-0000-0000-000000000015',
        'TEXT', '오늘은 조금 슬프고 속상했어',
        TIMESTAMP(DATE_SUB(@test_date, INTERVAL 4 DAY), '22:00:00')
    ),
    (
        @room_id, @partner_id,
        'd0000021-0000-0000-0000-000000000016',
        'TEXT', '많이 힘들었겠다 내가 옆에 있을게',
        TIMESTAMP(DATE_SUB(@test_date, INTERVAL 4 DAY), '22:04:00')
    )
ON DUPLICATE KEY UPDATE
    `room_id` = VALUES(`room_id`),
    `message_type` = VALUES(`message_type`),
    `content` = VALUES(`content`),
    `sent_at` = VALUES(`sent_at`);

-- ---------------------------------------------------------
-- 2. 한 메시지에 포함된 여러 이미지
-- ---------------------------------------------------------
SET @image_message_id = (
    SELECT `message_id`
    FROM `chat_message`
    WHERE `sender_id` = @target_user_id
      AND `client_message_id` =
          'd0000021-0000-0000-0000-000000000008'
);

INSERT INTO `chat_message_image` (
    `message_id`,
    `image_url`,
    `display_order`,
    `created_at`
)
VALUES
    (
        @image_message_id,
        'https://placehold.co/600x400/png?text=Emour+Photo+1',
        1,
        TIMESTAMP(@test_date, '21:10:00')
    ),
    (
        @image_message_id,
        'https://placehold.co/600x400/png?text=Emour+Photo+2',
        2,
        TIMESTAMP(@test_date, '21:10:00')
    ),
    (
        @image_message_id,
        'https://placehold.co/600x400/png?text=Emour+Photo+3',
        3,
        TIMESTAMP(@test_date, '21:10:00')
    )
ON DUPLICATE KEY UPDATE
    `image_url` = VALUES(`image_url`),
    `created_at` = VALUES(`created_at`);

-- ---------------------------------------------------------
-- 3. 감정 분석 완료 데이터
-- 대시보드는 COMPLETED 상태만 사용합니다.
-- ---------------------------------------------------------
INSERT INTO `chat_analysis` (
    `message_id`,
    `emotion_type`,
    `analysis_status`,
    `analyzed_at`,
    `created_at`
)
SELECT
    message.`message_id`,
    CASE message.`client_message_id`
        WHEN 'd0000021-0000-0000-0000-000000000001' THEN 'EXCITEMENT'
        WHEN 'd0000021-0000-0000-0000-000000000002' THEN 'JOY'
        WHEN 'd0000021-0000-0000-0000-000000000003' THEN 'CURIOSITY'
        WHEN 'd0000021-0000-0000-0000-000000000004' THEN 'NEUTRAL'
        WHEN 'd0000021-0000-0000-0000-000000000005' THEN 'JOY'
        WHEN 'd0000021-0000-0000-0000-000000000006' THEN 'COMFORT'
        WHEN 'd0000021-0000-0000-0000-000000000007' THEN 'EXCITEMENT'
        WHEN 'd0000021-0000-0000-0000-000000000009' THEN 'JOY'
        WHEN 'd0000021-0000-0000-0000-000000000010' THEN 'JOY'
        WHEN 'd0000021-0000-0000-0000-000000000011' THEN 'WORRY'
        WHEN 'd0000021-0000-0000-0000-000000000012' THEN 'COMFORT'
        WHEN 'd0000021-0000-0000-0000-000000000013' THEN 'APOLOGY'
        WHEN 'd0000021-0000-0000-0000-000000000014' THEN 'COMFORT'
        WHEN 'd0000021-0000-0000-0000-000000000015' THEN 'SADNESS'
        WHEN 'd0000021-0000-0000-0000-000000000016' THEN 'COMFORT'
    END,
    'COMPLETED',
    DATE_ADD(message.`sent_at`, INTERVAL 1 MINUTE),
    message.`sent_at`
FROM `chat_message` message
WHERE message.`client_message_id` BETWEEN
          'd0000021-0000-0000-0000-000000000001'
          AND
          'd0000021-0000-0000-0000-000000000016'
  AND message.`message_type` = 'TEXT'
ON DUPLICATE KEY UPDATE
    `emotion_type` = VALUES(`emotion_type`),
    `analysis_status` = 'COMPLETED',
    `analyzed_at` = VALUES(`analyzed_at`);

-- ---------------------------------------------------------
-- 4. 21번 사용자의 공감과 북마크
-- 상대방 메시지 두 개에 공감하고 저장한 상황입니다.
-- ---------------------------------------------------------
SET @partner_message_one = (
    SELECT `message_id`
    FROM `chat_message`
    WHERE `sender_id` = @partner_id
      AND `client_message_id` =
          'd0000021-0000-0000-0000-000000000006'
);

SET @partner_message_two = (
    SELECT `message_id`
    FROM `chat_message`
    WHERE `sender_id` = @partner_id
      AND `client_message_id` =
          'd0000021-0000-0000-0000-000000000009'
);

INSERT INTO `chat_reaction` (
    `room_id`,
    `user_id`,
    `message_id`,
    `reaction_type`,
    `created_at`,
    `updated_at`
)
VALUES
    (
        @room_id, @target_user_id, @partner_message_one,
        'HEART',
        TIMESTAMP(@test_date, '21:02:00'),
        TIMESTAMP(@test_date, '21:02:00')
    ),
    (
        @room_id, @target_user_id, @partner_message_two,
        'LIKE',
        TIMESTAMP(@test_date, '21:16:00'),
        TIMESTAMP(@test_date, '21:16:00')
    )
ON DUPLICATE KEY UPDATE
    `room_id` = VALUES(`room_id`),
    `reaction_type` = VALUES(`reaction_type`),
    `created_at` = VALUES(`created_at`),
    `updated_at` = VALUES(`updated_at`);

INSERT INTO `chat_bookmark` (
    `room_id`,
    `user_id`,
    `message_id`,
    `created_at`
)
VALUES
    (
        @room_id, @target_user_id, @partner_message_one,
        TIMESTAMP(@test_date, '21:02:30')
    ),
    (
        @room_id, @target_user_id, @partner_message_two,
        TIMESTAMP(@test_date, '21:16:30')
    )
ON DUPLICATE KEY UPDATE
    `room_id` = VALUES(`room_id`),
    `created_at` = VALUES(`created_at`);

-- 기존 집계 캐시를 지우면 다음 Swagger 조회에서 원본 데이터로 다시 계산합니다.
DELETE FROM `dashboard`
WHERE `room_id` = @room_id
  AND `user_id` = @target_user_id
  AND `summary_date` BETWEEN
      DATE_SUB(@test_date, INTERVAL 4 DAY)
      AND @test_date;

COMMIT;

-- ---------------------------------------------------------
-- 실행 결과 및 Swagger 입력값
-- ---------------------------------------------------------
SELECT
    @room_id AS `roomId`,
    @test_date AS `date`,
    'DAY' AS `period`,
    'Swagger Authorization에는 21번 사용자의 Access Token 입력' AS `guide`;
