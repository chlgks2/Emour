-- test1@ssafy.com / test2@ssafy.com 대시보드 확인용 더미데이터
-- MySQL 8 기준입니다.
-- user_id와 room_id는 서버 DB에서 이메일을 기준으로 자동 조회합니다.
-- 두 회원의 공통방이 없으면 테스트용 활성 커플방을 새로 만듭니다.

USE emour;

-- 회원 데이터가 전혀 없어도 로그인할 수 있도록 두 테스트 계정을 먼저 생성합니다.
-- 두 계정의 비밀번호: password123!
INSERT INTO app_user (
    email,
    password_hash,
    nickname,
    birth,
    profile_image_url,
    status_message,
    status,
    created_at,
    updated_at,
    is_email_verified,
    deleted_at
)
VALUES
    (
        'test1@ssafy.com',
        '$2a$10$QPnJeVv2CJwbn8gzDPUGIuEJ8elPb.wdMZ0cYJZOZ3v60J54f5SbS',
        '하나',
        '1999-01-15',
        'https://placehold.co/300x300/png?text=Test+1',
        '오늘도 행복한 하루',
        'ACTIVE',
        NOW(),
        NOW(),
        TRUE,
        NULL
    ),
    (
        'test2@ssafy.com',
        '$2a$10$QPnJeVv2CJwbn8gzDPUGIuEJ8elPb.wdMZ0cYJZOZ3v60J54f5SbS',
        '두리',
        '2000-05-20',
        'https://placehold.co/300x300/png?text=Test+2',
        '함께라서 즐거워',
        'ACTIVE',
        NOW(),
        NOW(),
        TRUE,
        NULL
    )
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    nickname = VALUES(nickname),
    status = 'ACTIVE',
    is_email_verified = TRUE,
    deleted_at = NULL,
    updated_at = NOW();

SET @test1_id := (
    SELECT user_id
    FROM app_user
    WHERE email = 'test1@ssafy.com'
    LIMIT 1
);

SET @test2_id := (
    SELECT user_id
    FROM app_user
    WHERE email = 'test2@ssafy.com'
    LIMIT 1
);

SET @test1_nickname := (
    SELECT nickname
    FROM app_user
    WHERE user_id = @test1_id
    LIMIT 1
);

SET @test2_nickname := (
    SELECT nickname
    FROM app_user
    WHERE user_id = @test2_id
    LIMIT 1
);

-- 상태와 관계없이 두 회원이 함께 들어 있는 기존 방을 먼저 찾습니다.
SET @room_id := (
    SELECT first_member.room_id
    FROM couple_member first_member
    JOIN couple_member second_member
      ON second_member.room_id = first_member.room_id
    WHERE first_member.user_id = @test1_id
      AND second_member.user_id = @test2_id
    ORDER BY first_member.joined_at DESC
    LIMIT 1
);

-- 공통방이 없을 때만 테스트용 방을 생성합니다.
INSERT INTO couple_room (
    room_code,
    room_code_expires_at,
    dating_start_date,
    status,
    created_at,
    updated_at
)
SELECT
    CONCAT('DASH-', LEFT(REPLACE(UUID(), '-', ''), 27)),
    NULL,
    DATE_SUB(CURDATE(), INTERVAL 100 DAY),
    'ACTIVE',
    NOW(),
    NOW()
WHERE @room_id IS NULL
  AND @test1_id IS NOT NULL
  AND @test2_id IS NOT NULL;

SET @created_room_id := IF(ROW_COUNT() = 1, LAST_INSERT_ID(), NULL);
SET @room_id := COALESCE(@room_id, @created_room_id);

-- 기존 공통방이 비활성 상태였다면 테스트를 위해 활성화합니다.
UPDATE couple_room
SET status = 'ACTIVE',
    dating_start_date = COALESCE(
        dating_start_date,
        DATE_SUB(CURDATE(), INTERVAL 100 DAY)
    ),
    updated_at = NOW()
WHERE room_id = @room_id;

-- 공통방의 멤버 행이 없거나 LEFT 상태여도 두 테스트 계정을 활성 멤버로 맞춥니다.
INSERT INTO couple_member (
    room_id,
    user_id,
    partner_nickname,
    status,
    joined_at,
    left_at
)
SELECT
    @room_id,
    @test1_id,
    @test2_nickname,
    'ACTIVE',
    NOW(),
    NULL
WHERE @room_id IS NOT NULL
  AND @test1_id IS NOT NULL
UNION ALL
SELECT
    @room_id,
    @test2_id,
    @test1_nickname,
    'ACTIVE',
    NOW(),
    NULL
WHERE @room_id IS NOT NULL
  AND @test2_id IS NOT NULL
ON DUPLICATE KEY UPDATE
    partner_nickname = VALUES(partner_nickname),
    status = 'ACTIVE',
    left_at = NULL;

-- 아래 결과에서 user_id나 room_id가 NULL이면 계정 이메일을 먼저 확인해야 합니다.
SELECT
    @test1_id AS test1_user_id,
    @test2_id AS test2_user_id,
    @room_id AS room_id;

-- 현재 일/주/월/연 데이터를 서로 다르게 확인하기 위한 기준 시각입니다.
SET @week_start := DATE_SUB(CURDATE(), INTERVAL (DAYOFWEEK(CURDATE()) - 1) DAY);
SET @month_start := DATE_SUB(CURDATE(), INTERVAL (DAY(CURDATE()) - 1) DAY);
SET @year_start := MAKEDATE(YEAR(CURDATE()), 1);

SET @week_time := IF(
    @week_start < CURDATE(),
    TIMESTAMP(@week_start, '20:00:00'),
    DATE_SUB(NOW(), INTERVAL 3 HOUR)
);
SET @month_time := IF(
    DAY(CURDATE()) > 3,
    TIMESTAMP(DATE_ADD(@month_start, INTERVAL 2 DAY), '19:00:00'),
    DATE_SUB(NOW(), INTERVAL 4 HOUR)
);
SET @year_time := IF(
    DAYOFYEAR(CURDATE()) > 15,
    TIMESTAMP(DATE_ADD(@year_start, INTERVAL 14 DAY), '18:00:00'),
    DATE_SUB(NOW(), INTERVAL 5 HOUR)
);

-- 고정 client_message_id를 사용하므로 같은 스크립트를 다시 실행해도 메시지가 중복되지 않습니다.
INSERT INTO chat_message (
    room_id,
    sender_id,
    client_message_id,
    message_type,
    content,
    sent_at
)
VALUES
    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000001', 'TEXT',  '오늘 저녁에 같이 맛있는 저녁 먹자', DATE_SUB(NOW(), INTERVAL 100 MINUTE)),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000002', 'TEXT',  '좋아 오늘 정말 기대된다',                DATE_SUB(NOW(), INTERVAL 94 MINUTE)),
    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000003', 'TEXT',  '어떤 메뉴가 먹고 싶어?',                  DATE_SUB(NOW(), INTERVAL 88 MINUTE)),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000004', 'TEXT',  '나는 파스타가 먹고 싶어',                  DATE_SUB(NOW(), INTERVAL 81 MINUTE)),
    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000005', 'TEXT',  '예약할 수 있는지 알아볼게',                 DATE_SUB(NOW(), INTERVAL 74 MINUTE)),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000006', 'TEXT',  '항상 챙겨줘서 고마워',                     DATE_SUB(NOW(), INTERVAL 68 MINUTE)),
    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000007', 'TEXT',  '오늘 일이 많아서 조금 걱정돼',               DATE_SUB(NOW(), INTERVAL 55 MINUTE)),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000008', 'TEXT',  '천천히 해도 괜찮아 내가 응원할게',             DATE_SUB(NOW(), INTERVAL 48 MINUTE)),
    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000009', 'TEXT',  '그 말 들으니까 마음이 편안해졌어',             DATE_SUB(NOW(), INTERVAL 35 MINUTE)),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000010', 'TEXT',  '우리 오늘도 즐겁게 보내자',                  DATE_SUB(NOW(), INTERVAL 28 MINUTE)),

    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000011', 'TEXT',  '이번 주말에 데이트 어디로 갈까?',              @week_time),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000012', 'TEXT',  '한강 산책하면 즐거울 것 같아',                DATE_ADD(@week_time, INTERVAL 8 MINUTE)),
    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000013', 'TEXT',  '날씨가 좋으면 사진도 많이 찍자',               DATE_ADD(@week_time, INTERVAL 16 MINUTE)),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000014', 'TEXT',  '벌써부터 설레고 기대돼',                     DATE_ADD(@week_time, INTERVAL 23 MINUTE)),

    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000015', 'TEXT',  '이번 달에는 같이 영화도 많이 봤네',             @month_time),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000016', 'TEXT',  '같이 보내는 시간이 정말 좋아',                DATE_ADD(@month_time, INTERVAL 5 MINUTE)),
    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000017', 'TEXT',  '내가 늦어서 미안해',                        DATE_ADD(@month_time, INTERVAL 12 MINUTE)),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000018', 'TEXT',  '괜찮아 다음에는 미리 알려줘',                 DATE_ADD(@month_time, INTERVAL 19 MINUTE)),

    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000019', 'TEXT',  '올해 처음 만났던 날 기억나?',                 @year_time),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000020', 'TEXT',  '당연하지 그날 정말 행복했어',                 DATE_ADD(@year_time, INTERVAL 6 MINUTE)),
    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000021', 'TEXT',  '앞으로도 좋은 추억 많이 만들자',               DATE_ADD(@year_time, INTERVAL 13 MINUTE)),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000022', 'TEXT',  '늘 함께해 줘서 고마워 사랑해',                DATE_ADD(@year_time, INTERVAL 20 MINUTE)),

    (@room_id, @test1_id, 'd3000000-0000-0000-0000-000000000023', 'IMAGE', NULL, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
    (@room_id, @test2_id, 'd3000000-0000-0000-0000-000000000024', 'IMAGE', NULL, DATE_SUB(NOW(), INTERVAL 12 MINUTE))
ON DUPLICATE KEY UPDATE
    room_id = VALUES(room_id),
    message_type = VALUES(message_type),
    content = VALUES(content),
    sent_at = VALUES(sent_at);

-- 텍스트 메시지의 AI 감정 분석 완료 결과입니다.
INSERT INTO chat_analysis (
    message_id,
    emotion_type,
    analysis_status,
    analyzed_at,
    created_at
)
SELECT
    message.message_id,
    CASE message.client_message_id
        WHEN 'd3000000-0000-0000-0000-000000000001' THEN 'JOY'
        WHEN 'd3000000-0000-0000-0000-000000000002' THEN 'EXCITEMENT'
        WHEN 'd3000000-0000-0000-0000-000000000003' THEN 'CURIOSITY'
        WHEN 'd3000000-0000-0000-0000-000000000004' THEN 'JOY'
        WHEN 'd3000000-0000-0000-0000-000000000005' THEN 'NEUTRAL'
        WHEN 'd3000000-0000-0000-0000-000000000006' THEN 'GRATITUDE'
        WHEN 'd3000000-0000-0000-0000-000000000007' THEN 'WORRY'
        WHEN 'd3000000-0000-0000-0000-000000000008' THEN 'COMFORT'
        WHEN 'd3000000-0000-0000-0000-000000000009' THEN 'COMFORT'
        WHEN 'd3000000-0000-0000-0000-000000000010' THEN 'JOY'
        WHEN 'd3000000-0000-0000-0000-000000000011' THEN 'CURIOSITY'
        WHEN 'd3000000-0000-0000-0000-000000000012' THEN 'JOY'
        WHEN 'd3000000-0000-0000-0000-000000000013' THEN 'EXCITEMENT'
        WHEN 'd3000000-0000-0000-0000-000000000014' THEN 'EXCITEMENT'
        WHEN 'd3000000-0000-0000-0000-000000000015' THEN 'SURPRISE'
        WHEN 'd3000000-0000-0000-0000-000000000016' THEN 'JOY'
        WHEN 'd3000000-0000-0000-0000-000000000017' THEN 'APOLOGY'
        WHEN 'd3000000-0000-0000-0000-000000000018' THEN 'COMFORT'
        WHEN 'd3000000-0000-0000-0000-000000000019' THEN 'CURIOSITY'
        WHEN 'd3000000-0000-0000-0000-000000000020' THEN 'JOY'
        WHEN 'd3000000-0000-0000-0000-000000000021' THEN 'EXCITEMENT'
        WHEN 'd3000000-0000-0000-0000-000000000022' THEN 'GRATITUDE'
        ELSE 'NEUTRAL'
    END,
    'COMPLETED',
    DATE_ADD(message.sent_at, INTERVAL 1 SECOND),
    message.sent_at
FROM chat_message message
WHERE message.sender_id IN (@test1_id, @test2_id)
  AND message.client_message_id BETWEEN
      'd3000000-0000-0000-0000-000000000001'
      AND 'd3000000-0000-0000-0000-000000000022'
ON DUPLICATE KEY UPDATE
    emotion_type = VALUES(emotion_type),
    analysis_status = 'COMPLETED',
    analyzed_at = VALUES(analyzed_at);

-- 한 메시지에서 이미지 여러 장을 보낸 상황을 확인할 수 있습니다.
INSERT INTO chat_message_image (
    message_id,
    image_url,
    display_order,
    created_at
)
SELECT message_id, 'https://placehold.co/800x600/png?text=Emour+Photo+1', 1, sent_at
FROM chat_message
WHERE sender_id = @test1_id
  AND client_message_id = 'd3000000-0000-0000-0000-000000000023'
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);

INSERT INTO chat_message_image (
    message_id,
    image_url,
    display_order,
    created_at
)
SELECT message_id, 'https://placehold.co/800x600/png?text=Emour+Photo+2', 2, sent_at
FROM chat_message
WHERE sender_id = @test1_id
  AND client_message_id = 'd3000000-0000-0000-0000-000000000023'
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);

INSERT INTO chat_message_image (
    message_id,
    image_url,
    display_order,
    created_at
)
SELECT message_id, 'https://placehold.co/800x600/png?text=Emour+Photo+3', 1, sent_at
FROM chat_message
WHERE sender_id = @test2_id
  AND client_message_id = 'd3000000-0000-0000-0000-000000000024'
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);

-- 공감 데이터: 정량적 기록의 reactionCount에 반영됩니다.
INSERT INTO chat_reaction (
    room_id,
    user_id,
    message_id,
    reaction_type,
    created_at,
    updated_at
)
SELECT @room_id, @test2_id, message_id, 'HEART', sent_at, sent_at
FROM chat_message
WHERE sender_id = @test1_id
  AND client_message_id IN (
      'd3000000-0000-0000-0000-000000000001',
      'd3000000-0000-0000-0000-000000000007',
      'd3000000-0000-0000-0000-000000000013'
  )
ON DUPLICATE KEY UPDATE
    reaction_type = VALUES(reaction_type),
    created_at = VALUES(created_at),
    updated_at = VALUES(updated_at);

INSERT INTO chat_reaction (
    room_id,
    user_id,
    message_id,
    reaction_type,
    created_at,
    updated_at
)
SELECT @room_id, @test1_id, message_id, 'LOVE', sent_at, sent_at
FROM chat_message
WHERE sender_id = @test2_id
  AND client_message_id IN (
      'd3000000-0000-0000-0000-000000000006',
      'd3000000-0000-0000-0000-000000000014',
      'd3000000-0000-0000-0000-000000000022'
  )
ON DUPLICATE KEY UPDATE
    reaction_type = VALUES(reaction_type),
    created_at = VALUES(created_at),
    updated_at = VALUES(updated_at);

-- 각 사용자가 저장한 하이라이트 메시지입니다.
INSERT INTO chat_bookmark (
    room_id,
    user_id,
    message_id,
    created_at
)
SELECT @room_id, @test1_id, message_id, sent_at
FROM chat_message
WHERE sender_id = @test2_id
  AND client_message_id IN (
      'd3000000-0000-0000-0000-000000000006',
      'd3000000-0000-0000-0000-000000000014',
      'd3000000-0000-0000-0000-000000000022'
  )
ON DUPLICATE KEY UPDATE created_at = VALUES(created_at);

INSERT INTO chat_bookmark (
    room_id,
    user_id,
    message_id,
    created_at
)
SELECT @room_id, @test2_id, message_id, sent_at
FROM chat_message
WHERE sender_id = @test1_id
  AND client_message_id IN (
      'd3000000-0000-0000-0000-000000000001',
      'd3000000-0000-0000-0000-000000000013',
      'd3000000-0000-0000-0000-000000000021'
  )
ON DUPLICATE KEY UPDATE created_at = VALUES(created_at);

-- ============================================================================
-- 대화 기록 리포트용 데이터
-- 최근 35일 동안 매일 아침과 저녁에 4개씩 대화한 기록을 생성합니다.
-- 일간·주간·월간의 날짜별 대화량, 활발한 시간, 평균 응답 시간을 확인할 수 있습니다.
-- ============================================================================
INSERT INTO chat_message (
    room_id,
    sender_id,
    client_message_id,
    message_type,
    content,
    sent_at
)
WITH RECURSIVE report_days AS (
    SELECT 0 AS day_offset
    UNION ALL
    SELECT day_offset + 1
    FROM report_days
    WHERE day_offset < 34
),
message_slots AS (
    SELECT 1 AS slot_number, '08:30:00' AS message_time
    UNION ALL SELECT 2, '08:36:00'
    UNION ALL SELECT 3, '20:00:00'
    UNION ALL SELECT 4, '20:09:00'
),
generated_messages AS (
    SELECT
        report_days.day_offset,
        message_slots.slot_number,
        message_slots.message_time,
        DATE_SUB(
            CURDATE(),
            INTERVAL report_days.day_offset DAY
        ) AS message_date,
        CONCAT(
            'd4000000-0000-0000-0000-',
            DATE_FORMAT(
                DATE_SUB(
                    CURDATE(),
                    INTERVAL report_days.day_offset DAY
                ),
                '%Y%m%d'
            ),
            LPAD(message_slots.slot_number, 4, '0')
        ) AS client_message_id
    FROM report_days
    CROSS JOIN message_slots
)
SELECT
    @room_id,
    CASE
        WHEN report_message.slot_number IN (1, 3) THEN @test1_id
        ELSE @test2_id
    END,
    report_message.client_message_id,
    'TEXT',
    CASE report_message.slot_number
        WHEN 1 THEN CASE MOD(report_message.day_offset, 4)
            WHEN 0 THEN '좋은 아침 오늘도 사랑해'
            WHEN 1 THEN '오늘 하루도 같이 힘내자'
            WHEN 2 THEN '아침 잘 챙겨 먹고 좋은 하루 보내'
            ELSE '오늘 날씨가 좋아서 기분이 좋다'
        END
        WHEN 2 THEN CASE MOD(report_message.day_offset, 4)
            WHEN 0 THEN '나도 사랑해 오늘도 행복하게 보내자'
            WHEN 1 THEN '응원해 줘서 고마워 힘이 난다'
            WHEN 2 THEN '걱정해 줘서 고마워 너도 잘 챙겨 먹어'
            ELSE '맞아 오늘 저녁에 같이 산책하자'
        END
        WHEN 3 THEN CASE MOD(report_message.day_offset, 5)
            WHEN 0 THEN '오늘 저녁 데이트 정말 즐거웠어'
            WHEN 1 THEN '같이 본 영화가 재미있었어'
            WHEN 2 THEN '오늘 일이 많아서 조금 힘들었어'
            WHEN 3 THEN '주말 여행 계획을 같이 세워보자'
            ELSE '맛있는 저녁 같이 먹어서 행복했어'
        END
        ELSE CASE MOD(report_message.day_offset, 5)
            WHEN 0 THEN '나도 즐거웠어 다음에 또 데이트하자'
            WHEN 1 THEN '다음에는 보고 싶은 영화를 같이 고르자'
            WHEN 2 THEN '오늘 고생 많았어 푹 쉬어'
            WHEN 3 THEN '좋아 벌써부터 여행이 기대돼'
            ELSE '함께해서 더 행복했어 고마워'
        END
    END,
    TIMESTAMP(report_message.message_date, report_message.message_time)
FROM generated_messages report_message
WHERE @room_id IS NOT NULL
  AND TIMESTAMP(
      report_message.message_date,
      report_message.message_time
  ) <= NOW()
ON DUPLICATE KEY UPDATE
    content = VALUES(content),
    sent_at = VALUES(sent_at);

-- 리포트용 대화에도 감정 분석 완료 결과를 연결합니다.
INSERT INTO chat_analysis (
    message_id,
    emotion_type,
    analysis_status,
    analyzed_at,
    created_at
)
WITH RECURSIVE report_days AS (
    SELECT 0 AS day_offset
    UNION ALL
    SELECT day_offset + 1
    FROM report_days
    WHERE day_offset < 34
),
message_slots AS (
    SELECT 1 AS slot_number
    UNION ALL SELECT 2
    UNION ALL SELECT 3
    UNION ALL SELECT 4
),
generated_ids AS (
    SELECT
        report_days.day_offset,
        message_slots.slot_number,
        CONCAT(
            'd4000000-0000-0000-0000-',
            DATE_FORMAT(
                DATE_SUB(
                    CURDATE(),
                    INTERVAL report_days.day_offset DAY
                ),
                '%Y%m%d'
            ),
            LPAD(message_slots.slot_number, 4, '0')
        ) AS client_message_id
    FROM report_days
    CROSS JOIN message_slots
)
SELECT
    message.message_id,
    CASE MOD(report_id.day_offset + report_id.slot_number, 15)
        WHEN 0 THEN 'JOY'
        WHEN 1 THEN 'EXCITEMENT'
        WHEN 2 THEN 'COMFORT'
        WHEN 3 THEN 'WORRY'
        WHEN 4 THEN 'SURPRISE'
        WHEN 5 THEN 'NEUTRAL'
        WHEN 6 THEN 'EMBARRASSMENT'
        WHEN 7 THEN 'CURIOSITY'
        WHEN 8 THEN 'SADNESS'
        WHEN 9 THEN 'ANGER'
        WHEN 10 THEN 'CONFUSION'
        WHEN 11 THEN 'DISTRESS'
        WHEN 12 THEN 'GRATITUDE'
        WHEN 13 THEN 'APOLOGY'
        ELSE 'HURT'
    END,
    'COMPLETED',
    DATE_ADD(message.sent_at, INTERVAL 1 SECOND),
    message.sent_at
FROM generated_ids report_id
JOIN chat_message message
  ON message.client_message_id = report_id.client_message_id
 AND message.sender_id = CASE
      WHEN report_id.slot_number IN (1, 3) THEN @test1_id
      ELSE @test2_id
 END
ON DUPLICATE KEY UPDATE
    emotion_type = VALUES(emotion_type),
    analysis_status = 'COMPLETED',
    analyzed_at = VALUES(analyzed_at);

-- 날짜별로 공감 개수도 달라지도록 저녁 답장 메시지에 공감을 추가합니다.
INSERT INTO chat_reaction (
    room_id,
    user_id,
    message_id,
    reaction_type,
    created_at,
    updated_at
)
WITH RECURSIVE report_days AS (
    SELECT 0 AS day_offset
    UNION ALL
    SELECT day_offset + 1
    FROM report_days
    WHERE day_offset < 34
),
generated_ids AS (
    SELECT
        report_days.day_offset,
        CONCAT(
            'd4000000-0000-0000-0000-',
            DATE_FORMAT(
                DATE_SUB(
                    CURDATE(),
                    INTERVAL report_days.day_offset DAY
                ),
                '%Y%m%d'
            ),
            '0004'
        ) AS client_message_id
    FROM report_days
)
SELECT
    @room_id,
    @test1_id,
    message.message_id,
    CASE MOD(report_id.day_offset, 3)
        WHEN 0 THEN 'HEART'
        WHEN 1 THEN 'LOVE'
        ELSE 'LIKE'
    END,
    message.sent_at,
    message.sent_at
FROM generated_ids report_id
JOIN chat_message message
  ON message.sender_id = @test2_id
 AND message.client_message_id = report_id.client_message_id
ON DUPLICATE KEY UPDATE
    reaction_type = VALUES(reaction_type),
    created_at = VALUES(created_at),
    updated_at = VALUES(updated_at);

-- ============================================================================
-- 무드 트래커 리포트용 데이터
-- 최근 35일 동안 두 사용자에게 하루 한 건의 기분을 생성합니다.
-- mood 테이블의 사용자별 일일 1건 제약조건에 맞춘 데이터입니다.
-- ============================================================================
INSERT INTO mood (
    room_id,
    user_id,
    mood_date,
    mood_datetime,
    mood_type,
    reason,
    created_at,
    updated_at
)
WITH RECURSIVE mood_days AS (
    SELECT 0 AS day_offset
    UNION ALL
    SELECT day_offset + 1
    FROM mood_days
    WHERE day_offset < 34
),
members AS (
    SELECT @test1_id AS user_id, 0 AS member_number
    UNION ALL
    SELECT @test2_id, 1
),
generated_moods AS (
    SELECT
        mood_days.day_offset,
        members.user_id,
        members.member_number,
        TIMESTAMP(
            DATE_SUB(
                CURDATE(),
                INTERVAL mood_days.day_offset DAY
            ),
            CASE members.member_number
                WHEN 0 THEN '09:00:00'
                ELSE '09:30:00'
            END
        ) AS mood_datetime
    FROM mood_days
    CROSS JOIN members
)
SELECT
    @room_id,
    report_mood.user_id,
    DATE(report_mood.mood_datetime),
    report_mood.mood_datetime,
    CASE MOD(
        report_mood.day_offset
        + report_mood.member_number,
        5
    )
        WHEN 0 THEN 'VERY_HAPPY'
        WHEN 1 THEN 'HAPPY'
        WHEN 2 THEN 'NEUTRAL'
        WHEN 3 THEN 'SAD'
        ELSE 'VERY_SAD'
    END,
    CASE MOD(
        report_mood.day_offset
        + report_mood.member_number,
        5
    )
        WHEN 0 THEN '함께해서 정말 행복한 시간'
        WHEN 1 THEN '기분 좋은 하루'
        WHEN 2 THEN '평범하고 편안한 하루'
        WHEN 3 THEN '조금 지치고 속상한 하루'
        ELSE '많이 힘들어서 위로가 필요한 날'
    END,
    report_mood.mood_datetime,
    report_mood.mood_datetime
FROM generated_moods report_mood
WHERE @room_id IS NOT NULL
  AND report_mood.user_id IS NOT NULL
  AND report_mood.mood_datetime <= NOW()
ON DUPLICATE KEY UPDATE
    mood_type = VALUES(mood_type),
    reason = VALUES(reason),
    updated_at = VALUES(updated_at);

-- 실행 결과 확인
SELECT
    @test1_id AS test1_user_id,
    @test2_id AS test2_user_id,
    @room_id AS room_id;

SELECT
    COUNT(*) AS dummy_message_count,
    SUM(message_type = 'IMAGE') AS image_message_count
FROM chat_message
WHERE sender_id IN (@test1_id, @test2_id)
  AND client_message_id LIKE 'd3000000-%';

SELECT
    COUNT(*) AS report_message_count,
    MIN(sent_at) AS first_report_message_at,
    MAX(sent_at) AS last_report_message_at
FROM chat_message
WHERE room_id = @room_id
  AND client_message_id LIKE 'd4000000-%';

SELECT
    COUNT(*) AS mood_count,
    MIN(mood_datetime) AS first_mood_at,
    MAX(mood_datetime) AS last_mood_at
FROM mood
WHERE room_id = @room_id
  AND user_id IN (@test1_id, @test2_id);
