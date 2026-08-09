-- test1@ssafy.com / test2@ssafy.com 3년치 현실형 더미데이터
-- MySQL 8 기준
-- 비밀번호: password123!
--
-- 포함 데이터
-- 1. 매일 2~12건으로 양이 달라지는 자연스러운 대화
-- 2. 채팅 이미지, 감정 분석, 공감, 북마크, 읽음 상태
-- 3. 아침/저녁 기분, 주간 한줄 일기, 격주 앨범 사진
-- 4. 기념일, 생일, 월별 데이트, 여행, 병원, 공연 등의 일정
-- 5. 기존 대시보드 스냅샷 제거(다음 조회 때 원본 데이터로 재집계)
--
-- 같은 파일을 여러 번 실행해도 채팅과 부가 데이터가 중복되지 않도록 작성했습니다.

-- 기존 emour 스키마와 같은 collation으로 임시 테이블의 문자열 컬럼을 생성합니다.
-- MySQL 8 기본값인 utf8mb4_0900_ai_ci가 섞이면 client_message_id JOIN이 실패합니다.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emour;

SET @old_cte_max_recursion_depth := @@SESSION.cte_max_recursion_depth;
SET SESSION cte_max_recursion_depth = 5000;

-- ==========================================================================
-- 1. 테스트 회원과 커플방 준비
-- ==========================================================================

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
        'https://placehold.co/300x300/png?text=HANA',
        '오늘도 같이 웃기',
        'ACTIVE',
        DATE_SUB(NOW(), INTERVAL 3 YEAR),
        NOW(),
        TRUE,
        NULL
    ),
    (
        'test2@ssafy.com',
        '$2a$10$QPnJeVv2CJwbn8gzDPUGIuEJ8elPb.wdMZ0cYJZOZ3v60J54f5SbS',
        '두리',
        '2000-05-20',
        'https://placehold.co/300x300/png?text=DURI',
        '천천히 오래오래',
        'ACTIVE',
        DATE_SUB(NOW(), INTERVAL 3 YEAR),
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
    SELECT user_id FROM app_user WHERE email = 'test1@ssafy.com' LIMIT 1
);
SET @test2_id := (
    SELECT user_id FROM app_user WHERE email = 'test2@ssafy.com' LIMIT 1
);
SET @dummy_start_date := DATE_SUB(CURDATE(), INTERVAL 3 YEAR);

-- 두 테스트 회원이 함께 속한 방이 있으면 그 방을 사용합니다.
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

-- 공통방이 없을 때만 새 테스트 방을 만듭니다.
INSERT INTO couple_room (
    room_code,
    room_code_expires_at,
    dating_start_date,
    status,
    created_at,
    updated_at
)
SELECT
    CONCAT('MY3-', LEFT(REPLACE(UUID(), '-', ''), 28)),
    NULL,
    @dummy_start_date,
    'ACTIVE',
    TIMESTAMP(@dummy_start_date, '00:00:00'),
    NOW()
WHERE @room_id IS NULL
  AND @test1_id IS NOT NULL
  AND @test2_id IS NOT NULL;

SET @created_room_id := IF(ROW_COUNT() = 1, LAST_INSERT_ID(), NULL);
SET @room_id := COALESCE(@room_id, @created_room_id);

UPDATE couple_room
SET dating_start_date = CASE
        WHEN dating_start_date IS NULL OR dating_start_date > @dummy_start_date
            THEN @dummy_start_date
        ELSE dating_start_date
    END,
    status = 'ACTIVE',
    updated_at = NOW()
WHERE room_id = @room_id;

INSERT INTO couple_member (
    room_id,
    user_id,
    partner_nickname,
    status,
    joined_at,
    left_at
)
VALUES
    (
        @room_id,
        @test1_id,
        '두리',
        'ACTIVE',
        TIMESTAMP(@dummy_start_date, '00:00:00'),
        NULL
    ),
    (
        @room_id,
        @test2_id,
        '하나',
        'ACTIVE',
        TIMESTAMP(@dummy_start_date, '00:00:00'),
        NULL
    )
ON DUPLICATE KEY UPDATE
    partner_nickname = VALUES(partner_nickname),
    status = 'ACTIVE',
    joined_at = LEAST(joined_at, VALUES(joined_at)),
    left_at = NULL;

-- ==========================================================================
-- 2. 3년치 날짜와 대화 원본 생성
-- ==========================================================================

DROP TEMPORARY TABLE IF EXISTS tmp_dummy_days;
CREATE TEMPORARY TABLE tmp_dummy_days AS
WITH RECURSIVE day_sequence AS (
    SELECT 0 AS day_index, @dummy_start_date AS chat_date
    UNION ALL
    SELECT day_index + 1, DATE_ADD(chat_date, INTERVAL 1 DAY)
    FROM day_sequence
    WHERE chat_date < CURDATE()
)
SELECT
    day_index,
    chat_date,
    MOD(day_index, 12) AS conversation_theme,
    DAYOFWEEK(chat_date) IN (1, 7) AS is_weekend
FROM day_sequence;

DROP TEMPORARY TABLE IF EXISTS tmp_message_slots;
CREATE TEMPORARY TABLE tmp_message_slots (
    slot_no INT NOT NULL PRIMARY KEY,
    base_time TIME NOT NULL
);

INSERT INTO tmp_message_slots (slot_no, base_time)
VALUES
    (1, '07:35:00'),
    (2, '07:43:00'),
    (3, '11:48:00'),
    (4, '12:05:00'),
    (5, '17:52:00'),
    (6, '18:14:00'),
    (7, '21:18:00'),
    (8, '21:31:00'),
    (9, '14:02:00'),
    (10, '14:10:00'),
    (11, '23:01:00'),
    (12, '23:09:00');

DROP TEMPORARY TABLE IF EXISTS tmp_dummy_messages;
CREATE TEMPORARY TABLE tmp_dummy_messages AS
SELECT
    days.day_index,
    days.chat_date,
    slots.slot_no,
    CASE
        WHEN MOD(days.day_index + FLOOR((slots.slot_no - 1) / 2), 2) = 0
            THEN CASE WHEN MOD(slots.slot_no, 2) = 1 THEN @test1_id ELSE @test2_id END
        ELSE CASE WHEN MOD(slots.slot_no, 2) = 1 THEN @test2_id ELSE @test1_id END
    END AS sender_id,
    CONCAT(
        'e6000000-',
        DATE_FORMAT(days.chat_date, '%Y'), '-',
        DATE_FORMAT(days.chat_date, '%m%d'), '-',
        LPAD(slots.slot_no, 4, '0'), '-',
        LPAD(days.day_index * 100 + slots.slot_no, 12, '0')
    ) AS client_message_id,
    TIMESTAMP(days.chat_date, slots.base_time)
        + INTERVAL MOD(days.day_index * 7 + slots.slot_no * 3, 23) MINUTE AS sent_at,
    CASE slots.slot_no
        WHEN 1 THEN CASE days.conversation_theme
            WHEN 0 THEN '잘 잤어? 오늘 아침은 생각보다 안 춥다'
            WHEN 1 THEN '일어났어? 어제 늦게 자서 피곤하지'
            WHEN 2 THEN '좋은 아침! 오늘 중요한 일 있다고 했지?'
            WHEN 3 THEN '나 출근하는 중이야, 지하철 사람이 엄청 많아'
            WHEN 4 THEN '밖에 비 온다. 우산 꼭 챙겨'
            WHEN 5 THEN '눈 뜨자마자 네 생각나서 연락했어'
            WHEN 6 THEN '오늘 아침 뭐 먹을 거야? 굶지 마'
            WHEN 7 THEN '나 오늘 조금 긴장돼. 잘할 수 있겠지?'
            WHEN 8 THEN '어제 보내준 사진 다시 봤는데 너무 웃겨'
            WHEN 9 THEN '주말 계획 슬슬 정해볼까?'
            WHEN 10 THEN '오늘도 파이팅! 끝나고 맛있는 거 먹자'
            ELSE '어제 내가 말이 좀 짧았지. 마음에 걸렸어'
        END
        WHEN 2 THEN CASE days.conversation_theme
            WHEN 0 THEN '응 잘 잤어! 너도 따뜻하게 입고 나가'
            WHEN 1 THEN '조금 피곤한데 괜찮아. 커피 마시면 살아날 듯'
            WHEN 2 THEN '응 기억해줬네 고마워. 끝나면 바로 알려줄게'
            WHEN 3 THEN '나도 막 나왔어. 사람 많으니까 조심해서 가'
            WHEN 4 THEN '알려줘서 다행이다. 현관에서 다시 챙겼어'
            WHEN 5 THEN '아침부터 왜 이렇게 설레게 해'
            WHEN 6 THEN '토스트 먹으려고. 너도 꼭 뭐라도 먹어'
            WHEN 7 THEN '당연하지. 준비한 만큼 잘할 거야'
            WHEN 8 THEN '그걸 또 봤어? 삭제하고 싶은 흑역사야'
            WHEN 9 THEN '좋아! 날씨 좋으면 한강 걷고 싶어'
            WHEN 10 THEN '너도 파이팅. 저녁 메뉴는 내가 고를게'
            ELSE '괜찮아. 나도 예민하게 받아들인 것 같아'
        END
        WHEN 3 THEN CASE MOD(days.day_index, 6)
            WHEN 0 THEN '점심 뭐 먹을지 아직도 못 정했어'
            WHEN 1 THEN '오전 일이 이제 끝났어. 잠깐 숨 돌리는 중'
            WHEN 2 THEN '오늘 회사 근처에 새로 생긴 가게 가보려고'
            WHEN 3 THEN '아까 회의에서 살짝 실수해서 속상해'
            WHEN 4 THEN '점심시간에 잠깐 통화 가능해?'
            ELSE '배고프다. 너는 벌써 밥 먹었어?'
        END
        WHEN 4 THEN CASE MOD(days.day_index, 6)
            WHEN 0 THEN '따뜻한 국물 먹어. 어제도 대충 먹었잖아'
            WHEN 1 THEN '고생했네. 물 마시고 천천히 밥 먹어'
            WHEN 2 THEN '맛있으면 다음에 나도 데려가 줘'
            WHEN 3 THEN '누구나 그럴 수 있어. 너무 오래 마음 쓰지 마'
            WHEN 4 THEN '응 10분 정도 괜찮아. 내가 먼저 전화할게'
            ELSE '나는 방금 먹었어. 사진 보낼 테니 메뉴 골라봐'
        END
        WHEN 5 THEN CASE MOD(days.day_index, 6)
            WHEN 0 THEN '이제 끝났다! 오늘 유난히 길게 느껴졌어'
            WHEN 1 THEN '퇴근 중인데 길이 많이 막혀'
            WHEN 2 THEN '오늘 운동 갈까 말까 계속 고민 중이야'
            WHEN 3 THEN '장 보러 가는데 필요한 거 있어?'
            WHEN 4 THEN '집 도착하면 바로 씻고 누울 거야'
            ELSE '저녁에 잠깐 산책하고 싶다'
        END
        WHEN 6 THEN CASE MOD(days.day_index, 6)
            WHEN 0 THEN '진짜 고생 많았어. 집 가서 푹 쉬자'
            WHEN 1 THEN '천천히 와. 도착할 때쯤 맞춰서 연락할게'
            WHEN 2 THEN '다녀오면 개운할 거야. 대신 무리하지는 마'
            WHEN 3 THEN '과일 있으면 조금만 사줘. 돈은 내가 보낼게'
            WHEN 4 THEN '오늘은 아무것도 하지 말고 쉬어도 돼'
            ELSE '좋아. 저녁 먹고 평소 걷던 곳에서 만나자'
        END
        WHEN 7 THEN CASE days.conversation_theme
            WHEN 0 THEN '오늘 하루 중에 제일 좋았던 순간은 뭐였어?'
            WHEN 1 THEN '다음 데이트 때는 우리 사진 많이 찍자'
            WHEN 2 THEN '아까 네가 응원해준 덕분에 잘 끝났어'
            WHEN 3 THEN '요즘 서로 바빠서 오래 이야기 못 한 것 같아'
            WHEN 4 THEN '주말에 같이 요리해 먹는 건 어때?'
            WHEN 5 THEN '문득 처음 만났던 날 생각났어'
            WHEN 6 THEN '오늘 네 목소리 들으니까 마음이 편해졌어'
            WHEN 7 THEN '다음 여행은 바다랑 산 중에 어디가 좋아?'
            WHEN 8 THEN '나 오늘 조금 서운했던 게 있었어'
            WHEN 9 THEN '보고 싶은 영화가 생겼는데 같이 볼래?'
            WHEN 10 THEN '우리 벌써 이렇게 오래 만난 게 신기해'
            ELSE '아까는 미안했어. 제대로 이야기하고 싶어'
        END
        WHEN 8 THEN CASE days.conversation_theme
            WHEN 0 THEN '너랑 이렇게 이야기하는 지금이 제일 좋아'
            WHEN 1 THEN '좋아. 이번에는 내가 삼각대 꼭 챙길게'
            WHEN 2 THEN '네가 잘한 거지! 그래도 내가 다 뿌듯하다'
            WHEN 3 THEN '맞아. 오늘은 자기 전에 조금 오래 통화하자'
            WHEN 4 THEN '완전 좋아. 실패해도 같이 먹으면 재미있을 듯'
            WHEN 5 THEN '나도 가끔 생각나. 그때 우리 둘 다 어색했지'
            WHEN 6 THEN '그렇게 말해줘서 고마워. 나도 편안해'
            WHEN 7 THEN '이번엔 바다! 해 질 때 같이 걷고 싶어'
            WHEN 8 THEN '말해줘서 고마워. 어떤 부분이었는지 듣고 싶어'
            WHEN 9 THEN '당연하지. 예매 열리면 바로 잡자'
            WHEN 10 THEN '앞으로도 지금처럼 서로 잘 챙겨주자'
            ELSE '나도 미안해. 감정 상하지 않게 천천히 말해보자'
        END
        WHEN 9 THEN CASE MOD(days.day_index, 4)
            WHEN 0 THEN '카페 도착했어. 창가 자리가 비어 있다'
            WHEN 1 THEN '날씨 좋아서 공원에 사람 정말 많아'
            WHEN 2 THEN '여기 전에 같이 왔던 길 맞지?'
            ELSE '오늘은 계획 없이 천천히 돌아다니자'
        END
        WHEN 10 THEN CASE MOD(days.day_index, 4)
            WHEN 0 THEN '잘했어. 나는 네가 좋아하는 음료 주문할게'
            WHEN 1 THEN '그래도 햇빛 좋다. 손잡고 천천히 걷자'
            WHEN 2 THEN '맞아. 저 앞에서 우리 사진도 찍었었어'
            ELSE '좋아. 배고파지면 그때 먹고 싶은 거 고르자'
        END
        WHEN 11 THEN CASE MOD(days.day_index, 4)
            WHEN 0 THEN '오늘 같이 있어줘서 고마워'
            WHEN 1 THEN '집에 들어가니까 갑자기 또 보고 싶다'
            WHEN 2 THEN '내일 일정 있으니까 너무 늦게 자지는 마'
            ELSE '우리 다음 주에도 시간 꼭 만들자'
        END
        ELSE CASE MOD(days.day_index, 4)
            WHEN 0 THEN '나도 고마워. 오늘 덕분에 많이 웃었어'
            WHEN 1 THEN '나도 그래. 영상통화 잠깐만 할까?'
            WHEN 2 THEN '알겠어. 너도 휴대폰 내려놓고 얼른 자'
            ELSE '응 약속. 이번 주 일정 보고 바로 정하자'
        END
    END AS content,
    CASE slots.slot_no
        WHEN 1 THEN CASE days.conversation_theme
            WHEN 4 THEN 'WORRY'
            WHEN 7 THEN 'WORRY'
            WHEN 11 THEN 'APOLOGY'
            ELSE 'COMFORT'
        END
        WHEN 2 THEN CASE days.conversation_theme
            WHEN 2 THEN 'GRATITUDE'
            WHEN 5 THEN 'EXCITEMENT'
            WHEN 11 THEN 'APOLOGY'
            ELSE 'COMFORT'
        END
        WHEN 3 THEN CASE MOD(days.day_index, 6)
            WHEN 3 THEN 'HURT'
            WHEN 4 THEN 'CURIOSITY'
            ELSE 'NEUTRAL'
        END
        WHEN 4 THEN CASE MOD(days.day_index, 6)
            WHEN 1 THEN 'COMFORT'
            WHEN 3 THEN 'COMFORT'
            ELSE 'NEUTRAL'
        END
        WHEN 5 THEN CASE MOD(days.day_index, 6)
            WHEN 0 THEN 'DISTRESS'
            WHEN 1 THEN 'DISTRESS'
            ELSE 'NEUTRAL'
        END
        WHEN 6 THEN 'COMFORT'
        WHEN 7 THEN CASE days.conversation_theme
            WHEN 2 THEN 'GRATITUDE'
            WHEN 5 THEN 'EXCITEMENT'
            WHEN 7 THEN 'CURIOSITY'
            WHEN 8 THEN 'HURT'
            WHEN 11 THEN 'APOLOGY'
            ELSE 'JOY'
        END
        WHEN 8 THEN CASE days.conversation_theme
            WHEN 2 THEN 'JOY'
            WHEN 7 THEN 'EXCITEMENT'
            WHEN 8 THEN 'COMFORT'
            WHEN 11 THEN 'APOLOGY'
            ELSE 'JOY'
        END
        WHEN 9 THEN 'JOY'
        WHEN 10 THEN 'COMFORT'
        WHEN 11 THEN 'GRATITUDE'
        ELSE 'JOY'
    END AS emotion_type
FROM tmp_dummy_days days
CROSS JOIN tmp_message_slots slots
WHERE (
        -- 아주 가끔 서로 바빠서 아침 인사만 한 날도 만듭니다.
        (MOD(days.day_index, 97) = 0 AND slots.slot_no IN (1, 2))
        OR
        (MOD(days.day_index, 97) <> 0 AND (
            slots.slot_no IN (1, 2, 7, 8)
            OR (slots.slot_no IN (3, 4) AND MOD(days.day_index, 4) <> 0)
            OR (slots.slot_no IN (5, 6) AND MOD(days.day_index, 3) <> 0)
            OR (slots.slot_no IN (9, 10) AND days.is_weekend = TRUE)
            OR (slots.slot_no IN (11, 12) AND MOD(days.day_index, 7) = 0)
        ))
    )
  AND TIMESTAMP(days.chat_date, slots.base_time)
        + INTERVAL MOD(days.day_index * 7 + slots.slot_no * 3, 23) MINUTE <= NOW();

INSERT INTO chat_message (
    room_id,
    sender_id,
    client_message_id,
    message_type,
    content,
    sent_at
)
SELECT
    @room_id,
    sender_id,
    client_message_id,
    'TEXT',
    content,
    sent_at
FROM tmp_dummy_messages
WHERE @room_id IS NOT NULL
ON DUPLICATE KEY UPDATE
    room_id = VALUES(room_id),
    message_type = 'TEXT',
    content = VALUES(content),
    sent_at = VALUES(sent_at);

-- 모든 텍스트 메시지는 이미 AI 감정 분석이 완료된 상태로 넣습니다.
INSERT INTO chat_analysis (
    message_id,
    emotion_type,
    analysis_status,
    analyzed_at,
    created_at
)
SELECT
    message.message_id,
    dummy_message.emotion_type,
    'COMPLETED',
    DATE_ADD(message.sent_at, INTERVAL 10 SECOND),
    DATE_ADD(message.sent_at, INTERVAL 10 SECOND)
FROM tmp_dummy_messages dummy_message
JOIN chat_message message
  ON message.sender_id = dummy_message.sender_id
 AND message.client_message_id = dummy_message.client_message_id
WHERE TRUE
ON DUPLICATE KEY UPDATE
    emotion_type = VALUES(emotion_type),
    analysis_status = 'COMPLETED',
    analyzed_at = VALUES(analyzed_at);

-- ==========================================================================
-- 3. 채팅 이미지: 약 9일마다 1~3장을 한 메시지로 전송
-- ==========================================================================

DROP TEMPORARY TABLE IF EXISTS tmp_image_messages;
CREATE TEMPORARY TABLE tmp_image_messages AS
SELECT
    days.day_index,
    days.chat_date,
    CASE WHEN MOD(days.day_index, 2) = 0 THEN @test1_id ELSE @test2_id END AS sender_id,
    CONCAT(
        'e6100000-',
        DATE_FORMAT(days.chat_date, '%Y'), '-',
        DATE_FORMAT(days.chat_date, '%m%d'), '-9000-',
        LPAD(days.day_index, 12, '0')
    ) AS client_message_id,
    TIMESTAMP(days.chat_date, '19:42:00')
        + INTERVAL MOD(days.day_index, 11) MINUTE AS sent_at,
    1 + MOD(days.day_index, 3) AS image_count
FROM tmp_dummy_days days
WHERE MOD(days.day_index, 9) = 0
  AND TIMESTAMP(days.chat_date, '19:42:00') <= NOW();

INSERT INTO chat_message (
    room_id,
    sender_id,
    client_message_id,
    message_type,
    content,
    sent_at
)
SELECT
    @room_id,
    sender_id,
    client_message_id,
    'IMAGE',
    NULL,
    sent_at
FROM tmp_image_messages
WHERE @room_id IS NOT NULL
ON DUPLICATE KEY UPDATE
    room_id = VALUES(room_id),
    message_type = 'IMAGE',
    content = NULL,
    sent_at = VALUES(sent_at);

INSERT INTO chat_message_image (
    message_id,
    image_url,
    display_order,
    created_at
)
SELECT
    message.message_id,
    CONCAT(
        'https://placehold.co/1200x900/png?text=CHAT-',
        DATE_FORMAT(image_message.chat_date, '%Y%m%d'), '-',
        image_numbers.display_order
    ),
    image_numbers.display_order,
    image_message.sent_at
FROM tmp_image_messages image_message
JOIN chat_message message
  ON message.sender_id = image_message.sender_id
 AND message.client_message_id = image_message.client_message_id
JOIN (
    SELECT 1 AS display_order
    UNION ALL SELECT 2
    UNION ALL SELECT 3
) image_numbers
  ON image_numbers.display_order <= image_message.image_count
WHERE TRUE
ON DUPLICATE KEY UPDATE
    image_url = VALUES(image_url),
    created_at = VALUES(created_at);

-- ==========================================================================
-- 4. 공감, 북마크, 읽음 상태
-- ==========================================================================

INSERT INTO chat_reaction (
    room_id,
    user_id,
    message_id,
    reaction_type,
    created_at,
    updated_at
)
SELECT
    @room_id,
    CASE WHEN message.sender_id = @test1_id THEN @test2_id ELSE @test1_id END,
    message.message_id,
    CASE MOD(dummy_message.day_index, 4)
        WHEN 0 THEN 'HEART'
        WHEN 1 THEN 'LIKE'
        WHEN 2 THEN 'HUG'
        ELSE 'SMILE'
    END,
    DATE_ADD(message.sent_at, INTERVAL 20 SECOND),
    DATE_ADD(message.sent_at, INTERVAL 20 SECOND)
FROM tmp_dummy_messages dummy_message
JOIN chat_message message
  ON message.sender_id = dummy_message.sender_id
 AND message.client_message_id = dummy_message.client_message_id
WHERE dummy_message.slot_no = 8
  AND MOD(dummy_message.day_index, 3) = 0
ON DUPLICATE KEY UPDATE
    reaction_type = VALUES(reaction_type),
    updated_at = VALUES(updated_at);

INSERT INTO chat_bookmark (
    room_id,
    user_id,
    message_id,
    created_at
)
SELECT
    @room_id,
    CASE WHEN message.sender_id = @test1_id THEN @test2_id ELSE @test1_id END,
    message.message_id,
    DATE_ADD(message.sent_at, INTERVAL 1 MINUTE)
FROM tmp_dummy_messages dummy_message
JOIN chat_message message
  ON message.sender_id = dummy_message.sender_id
 AND message.client_message_id = dummy_message.client_message_id
WHERE dummy_message.slot_no = 7
  AND MOD(dummy_message.day_index, 15) = 0
ON DUPLICATE KEY UPDATE
    created_at = VALUES(created_at);

SET @latest_message_id := (
    SELECT message_id
    FROM chat_message
    WHERE room_id = @room_id
    ORDER BY message_id DESC
    LIMIT 1
);

INSERT INTO chat_read_state (
    room_id,
    user_id,
    last_read_message_id,
    read_at
)
VALUES
    (@room_id, @test1_id, @latest_message_id, NOW()),
    (@room_id, @test2_id, @latest_message_id, NOW())
ON DUPLICATE KEY UPDATE
    last_read_message_id = VALUES(last_read_message_id),
    read_at = NOW();

-- ==========================================================================
-- 5. 3년치 오늘의 기분: 두 사람의 아침/저녁 기분
-- ==========================================================================

INSERT INTO mood (
    room_id,
    user_id,
    mood_datetime,
    mood_type,
    reason,
    created_at,
    updated_at
)
SELECT
    @room_id,
    members.user_id,
    TIMESTAMP(
        days.chat_date,
        CASE
            WHEN mood_slots.slot_no = 1 AND members.member_no = 1 THEN '08:15:00'
            WHEN mood_slots.slot_no = 1 AND members.member_no = 2 THEN '08:45:00'
            WHEN mood_slots.slot_no = 2 AND members.member_no = 1 THEN '21:15:00'
            ELSE '21:45:00'
        END
    ),
    CASE MOD(days.day_index + members.member_no + mood_slots.slot_no, 10)
        WHEN 0 THEN 'VERY_HAPPY'
        WHEN 1 THEN 'HAPPY'
        WHEN 2 THEN 'HAPPY'
        WHEN 3 THEN 'NEUTRAL'
        WHEN 4 THEN 'NEUTRAL'
        WHEN 5 THEN 'SAD'
        WHEN 6 THEN 'HAPPY'
        WHEN 7 THEN 'VERY_HAPPY'
        WHEN 8 THEN 'NEUTRAL'
        ELSE 'VERY_SAD'
    END,
    CASE MOD(days.day_index + members.member_no + mood_slots.slot_no, 10)
        WHEN 0 THEN '함께 좋은 시간을 보내서 정말 행복한 날'
        WHEN 1 THEN '작은 일들이 잘 풀려서 기분이 좋다'
        WHEN 2 THEN '서로 응원해줘서 힘이 났다'
        WHEN 3 THEN '특별한 일 없이 편안하게 보낸 하루'
        WHEN 4 THEN '조금 피곤하지만 무난한 하루'
        WHEN 5 THEN '일이 뜻대로 풀리지 않아 속상했다'
        WHEN 6 THEN '맛있는 것을 먹고 기분이 좋아졌다'
        WHEN 7 THEN '기다리던 약속이 있어서 많이 설렌다'
        WHEN 8 THEN '바쁜 하루였지만 잘 마무리했다'
        ELSE '마음이 많이 지쳐서 위로가 필요하다'
    END,
    TIMESTAMP(
        days.chat_date,
        CASE
            WHEN mood_slots.slot_no = 1 AND members.member_no = 1 THEN '08:15:00'
            WHEN mood_slots.slot_no = 1 AND members.member_no = 2 THEN '08:45:00'
            WHEN mood_slots.slot_no = 2 AND members.member_no = 1 THEN '21:15:00'
            ELSE '21:45:00'
        END
    ),
    TIMESTAMP(
        days.chat_date,
        CASE
            WHEN mood_slots.slot_no = 1 AND members.member_no = 1 THEN '08:15:00'
            WHEN mood_slots.slot_no = 1 AND members.member_no = 2 THEN '08:45:00'
            WHEN mood_slots.slot_no = 2 AND members.member_no = 1 THEN '21:15:00'
            ELSE '21:45:00'
        END
    )
FROM tmp_dummy_days days
CROSS JOIN (
    SELECT @test1_id AS user_id, 1 AS member_no
    UNION ALL
    SELECT @test2_id, 2
) members
CROSS JOIN (
    SELECT 1 AS slot_no
    UNION ALL
    SELECT 2
) mood_slots
WHERE TIMESTAMP(
        days.chat_date,
        CASE WHEN mood_slots.slot_no = 1 THEN '08:45:00' ELSE '21:45:00' END
    ) <= NOW()
  AND NOT (MOD(days.day_index, 13) = 0 AND mood_slots.slot_no = 2)
ON DUPLICATE KEY UPDATE
    mood_type = VALUES(mood_type),
    reason = VALUES(reason),
    updated_at = VALUES(updated_at);

-- ==========================================================================
-- 6. 한줄 일기: 약 일주일 간격, 사용자별 서로 다른 날짜
-- ==========================================================================

INSERT INTO diary (
    room_id,
    user_id,
    diary_date,
    content,
    created_at,
    updated_at
)
SELECT
    @room_id,
    CASE WHEN MOD(days.day_index, 2) = 0 THEN @test1_id ELSE @test2_id END,
    days.chat_date,
    CASE MOD(days.day_index, 8)
        WHEN 0 THEN '퇴근 후 함께 걸었던 짧은 산책이 오래 기억에 남을 것 같다.'
        WHEN 1 THEN '서로 바쁜 날이었지만 자기 전에 목소리를 들으니 마음이 놓였다.'
        WHEN 2 THEN '새로 찾아간 식당이 맛있었다. 다음에는 다른 메뉴도 먹어보기로 했다.'
        WHEN 3 THEN '사소하게 서운한 일이 있었지만 바로 이야기하고 풀어서 다행이다.'
        WHEN 4 THEN '별 계획 없이 보낸 주말인데 같이 있어서 충분히 즐거웠다.'
        WHEN 5 THEN '힘든 하루를 따뜻하게 위로해줘서 고마웠다.'
        WHEN 6 THEN '예전 사진을 보며 한참 웃었다. 시간이 참 빠르게 흐른다.'
        ELSE '다음 여행 계획을 세우기 시작했다. 벌써부터 기대된다.'
    END,
    TIMESTAMP(days.chat_date, '22:40:00'),
    TIMESTAMP(days.chat_date, '22:40:00')
FROM tmp_dummy_days days
WHERE MOD(days.day_index, 7) IN (0, 3)
  AND TIMESTAMP(days.chat_date, '22:40:00') <= NOW()
ON DUPLICATE KEY UPDATE
    content = VALUES(content),
    updated_at = VALUES(updated_at);

-- ==========================================================================
-- 7. 앨범: 격주 추억 사진
-- ==========================================================================

DELETE FROM album_photo
WHERE room_id = @room_id
  AND image_url LIKE 'https://placehold.co/1200x900/png?text=EMOUR-MY3-%';

INSERT INTO album_photo (
    room_id,
    uploader_id,
    image_url,
    memo,
    created_at
)
SELECT
    @room_id,
    CASE WHEN MOD(days.day_index, 2) = 0 THEN @test1_id ELSE @test2_id END,
    CONCAT(
        'https://placehold.co/1200x900/png?text=EMOUR-MY3-',
        DATE_FORMAT(days.chat_date, '%Y%m%d')
    ),
    CASE MOD(days.day_index, 6)
        WHEN 0 THEN '우리 동네 산책길에서'
        WHEN 1 THEN '기다리던 주말 데이트'
        WHEN 2 THEN '같이 먹어서 더 맛있었던 저녁'
        WHEN 3 THEN '짧지만 즐거웠던 여행'
        WHEN 4 THEN '처음 가본 카페에서'
        ELSE '평범해서 더 소중한 하루'
    END,
    TIMESTAMP(days.chat_date, '20:30:00')
FROM tmp_dummy_days days
WHERE MOD(days.day_index, 14) = 0
  AND TIMESTAMP(days.chat_date, '20:30:00') <= NOW();

-- ==========================================================================
-- 8. 일정: 기념일 + 매월 서로 다른 생활 일정
-- ==========================================================================

DELETE FROM couple_schedule
WHERE room_id = @room_id
  AND description LIKE '%#EMOUR-MULTI-YEAR-DUMMY%';

-- 서비스 시작일과 생일은 매년 반복되는 기념일입니다.
INSERT INTO couple_schedule (
    room_id,
    creator_id,
    name,
    description,
    schedule_date,
    schedule_time,
    schedule_type,
    yearly_recurring,
    created_at,
    updated_at
)
VALUES
    (
        @room_id,
        @test1_id,
        '우리 처음 만난 날',
        '매년 함께 기념하기 #EMOUR-MULTI-YEAR-DUMMY',
        @dummy_start_date,
        '19:00:00',
        'ANNIVERSARY',
        TRUE,
        TIMESTAMP(@dummy_start_date, '10:00:00'),
        TIMESTAMP(@dummy_start_date, '10:00:00')
    ),
    (
        @room_id,
        @test2_id,
        '하나 생일',
        '미리 선물 준비하기 #EMOUR-MULTI-YEAR-DUMMY',
        STR_TO_DATE(
            CONCAT(
                YEAR(@dummy_start_date)
                    + (DATE_FORMAT(@dummy_start_date, '%m%d') > '0115'),
                '-01-15'
            ),
            '%Y-%m-%d'
        ),
        NULL,
        'ANNIVERSARY',
        TRUE,
        TIMESTAMP(@dummy_start_date, '10:00:00'),
        TIMESTAMP(@dummy_start_date, '10:00:00')
    ),
    (
        @room_id,
        @test1_id,
        '두리 생일',
        '좋아하는 케이크 예약하기 #EMOUR-MULTI-YEAR-DUMMY',
        STR_TO_DATE(
            CONCAT(
                YEAR(@dummy_start_date)
                    + (DATE_FORMAT(@dummy_start_date, '%m%d') > '0520'),
                '-05-20'
            ),
            '%Y-%m-%d'
        ),
        NULL,
        'ANNIVERSARY',
        TRUE,
        TIMESTAMP(@dummy_start_date, '10:00:00'),
        TIMESTAMP(@dummy_start_date, '10:00:00')
    );

-- 각 달마다 데이트나 생활 일정이 하나씩 생기도록 만듭니다.
INSERT INTO couple_schedule (
    room_id,
    creator_id,
    name,
    description,
    schedule_date,
    schedule_time,
    schedule_type,
    yearly_recurring,
    created_at,
    updated_at
)
SELECT
    @room_id,
    CASE WHEN MOD(months.month_index, 2) = 0 THEN @test1_id ELSE @test2_id END,
    CASE MOD(months.month_index, 8)
        WHEN 0 THEN '전시회 데이트'
        WHEN 1 THEN '치과 정기 검진'
        WHEN 2 THEN '주말 근교 여행'
        WHEN 3 THEN '영화 예매일'
        WHEN 4 THEN '부모님과 저녁 식사'
        WHEN 5 THEN '공연 보러 가는 날'
        WHEN 6 THEN '커플 사진 촬영'
        ELSE '다음 달 여행 계획 세우기'
    END,
    CONCAT(
        CASE MOD(months.month_index, 8)
            WHEN 0 THEN '관심 있던 전시 함께 보기'
            WHEN 1 THEN '검진 시간 10분 전에 도착하기'
            WHEN 2 THEN '숙소와 기차표 다시 확인하기'
            WHEN 3 THEN '퇴근 후 영화관 앞에서 만나기'
            WHEN 4 THEN '예약한 식당에서 함께 식사하기'
            WHEN 5 THEN '공연 티켓과 신분증 챙기기'
            WHEN 6 THEN '맞춰 입을 옷 전날 준비하기'
            ELSE '가고 싶은 장소를 각자 세 곳씩 정하기'
        END,
        ' #EMOUR-MULTI-YEAR-DUMMY'
    ),
    DATE_ADD(
        DATE_ADD(
            DATE_FORMAT(@dummy_start_date, '%Y-%m-01'),
            INTERVAL months.month_index MONTH
        ),
        INTERVAL (4 + MOD(months.month_index * 7, 20)) DAY
    ),
    CASE MOD(months.month_index, 4)
        WHEN 0 THEN '14:00:00'
        WHEN 1 THEN '11:30:00'
        WHEN 2 THEN '09:00:00'
        ELSE '19:00:00'
    END,
    'SCHEDULE',
    FALSE,
    DATE_ADD(
        DATE_ADD(
            DATE_FORMAT(@dummy_start_date, '%Y-%m-01'),
            INTERVAL months.month_index MONTH
        ),
        INTERVAL 1 DAY
    ),
    DATE_ADD(
        DATE_ADD(
            DATE_FORMAT(@dummy_start_date, '%Y-%m-01'),
            INTERVAL months.month_index MONTH
        ),
        INTERVAL 1 DAY
    )
FROM (
    SELECT ones.n + tens.n * 10 AS month_index
    FROM (
        SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
        UNION ALL SELECT 8 UNION ALL SELECT 9
    ) ones
    CROSS JOIN (
        SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    ) tens
) months
WHERE DATE_ADD(
        DATE_FORMAT(@dummy_start_date, '%Y-%m-01'),
        INTERVAL months.month_index MONTH
    ) <= DATE_ADD(CURDATE(), INTERVAL 2 MONTH);

-- ==========================================================================
-- 9. 대시보드 재집계 준비
-- ==========================================================================

-- 대시보드는 원본 채팅/감정/이미지/반응을 기준으로 계산되는 파생 데이터입니다.
-- 이전 스냅샷을 제거하면 다음 대시보드 조회 시 DAY/WEEK/MONTH/YEAR/ALL 범위가
-- 방금 넣은 3년치 원본 데이터를 기준으로 다시 생성됩니다.
DELETE FROM member_dashboard WHERE room_id = @room_id;
DELETE FROM couple_dashboard WHERE room_id = @room_id;

-- 홈 화면도 테스트할 수 있도록 기본 설정을 하나 넣습니다.
INSERT INTO home_image_setting (
    room_id,
    image_url,
    text_content,
    text_position_x,
    text_position_y,
    text_size,
    text_alignment,
    background_transparency,
    text_color,
    created_at,
    updated_at
)
VALUES (
    @room_id,
    'https://placehold.co/1600x1000/png?text=OUR+THREE+YEARS',
    '오늘도 우리답게',
    50.00,
    82.00,
    28,
    'CENTER',
    72,
    'rgb(255, 255, 255)',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    image_url = VALUES(image_url),
    text_content = VALUES(text_content),
    text_position_x = VALUES(text_position_x),
    text_position_y = VALUES(text_position_y),
    text_size = VALUES(text_size),
    text_alignment = VALUES(text_alignment),
    background_transparency = VALUES(background_transparency),
    text_color = VALUES(text_color),
    updated_at = NOW();

-- ==========================================================================
-- 10. 실행 결과 확인
-- ==========================================================================

SELECT
    @test1_id AS test1_user_id,
    @test2_id AS test2_user_id,
    @room_id AS room_id,
    @dummy_start_date AS dummy_start_date,
    CURDATE() AS dummy_end_date;

SELECT
    YEAR(sent_at) AS report_year,
    MONTH(sent_at) AS report_month,
    COUNT(*) AS message_count,
    SUM(message_type = 'IMAGE') AS image_message_count
FROM chat_message
WHERE room_id = @room_id
  AND (
      client_message_id LIKE 'e6000000-%'
      OR client_message_id LIKE 'e6100000-%'
  )
GROUP BY YEAR(sent_at), MONTH(sent_at)
ORDER BY report_year, report_month;

SELECT
    COUNT(*) AS total_dummy_messages,
    MIN(sent_at) AS first_message_at,
    MAX(sent_at) AS last_message_at
FROM chat_message
WHERE room_id = @room_id
  AND (
      client_message_id LIKE 'e6000000-%'
      OR client_message_id LIKE 'e6100000-%'
  );

SELECT COUNT(*) AS total_moods
FROM mood
WHERE room_id = @room_id
  AND mood_datetime >= TIMESTAMP(@dummy_start_date, '00:00:00');

SELECT COUNT(*) AS total_schedules
FROM couple_schedule
WHERE room_id = @room_id
  AND description LIKE '%#EMOUR-MULTI-YEAR-DUMMY%';

DROP TEMPORARY TABLE IF EXISTS tmp_image_messages;
DROP TEMPORARY TABLE IF EXISTS tmp_dummy_messages;
DROP TEMPORARY TABLE IF EXISTS tmp_message_slots;
DROP TEMPORARY TABLE IF EXISTS tmp_dummy_days;

SET SESSION cte_max_recursion_depth = @old_cte_max_recursion_depth;
