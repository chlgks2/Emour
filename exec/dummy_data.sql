-- ============================================================================
-- test1@ssafy.com / test2@ssafy.com 대시보드 + 채팅 시연용 더미데이터 (최종본)
-- MySQL 8 기준
-- 비밀번호: password123!
--
-- 포함 데이터
-- 1. 최근 100분 이내 스팟 대화 22건 + 최근 35일 아침/저녁 리포트 대화
-- 2. 채팅 이미지 3건(실제 서버 업로드 파일), 감정 분석(15개 라벨 전부 등장, 내용과 일치),
--    공감(스팟 6건 + 매일 저녁 마지막 메시지 35건), 북마크 6건, 읽음 상태(최신까지 완료)
-- 3. 아침 기분(mood) 하루 1건씩 35일 x 2명, 5단계(VERY_HAPPY~VERY_SAD) 순환
-- 4. 기존 대시보드 스냅샷 제거(member_dashboard / couple_dashboard, 다음 조회 때 재집계)
--
-- ============================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emour;

-- ---------------------------------------------------------------------------
-- 0. 계정 / 방 준비
-- ---------------------------------------------------------------------------
INSERT INTO app_user (
    email, password_hash, nickname, birth, profile_image_url,
    status_message, status, created_at, updated_at, is_email_verified, deleted_at
)
VALUES
    (
        'test1@ssafy.com',
        '$2a$10$fRMPsbDHwJj56Y2BixuQRuoH1Bqp/kkXsimtvqunnup5yBc9zcPZa',
        '하나', '1999-01-15',
        'https://placehold.co/300x300/png?text=Test+1',
        '오늘도 행복한 하루', 'ACTIVE', NOW(), NOW(), TRUE, NULL
    ),
    (
        'test2@ssafy.com',
        '$2a$10$fRMPsbDHwJj56Y2BixuQRuoH1Bqp/kkXsimtvqunnup5yBc9zcPZa',
        '두리', '2000-05-20',
        'https://placehold.co/300x300/png?text=Test+2',
        '함께라서 즐거워', 'ACTIVE', NOW(), NOW(), TRUE, NULL
    )
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    nickname = VALUES(nickname),
    status = 'ACTIVE',
    is_email_verified = TRUE,
    deleted_at = NULL,
    updated_at = NOW();

SET @test1_id := (SELECT user_id FROM app_user WHERE email = 'test1@ssafy.com' LIMIT 1);
SET @test2_id := (SELECT user_id FROM app_user WHERE email = 'test2@ssafy.com' LIMIT 1);
SET @test1_nickname := (SELECT nickname FROM app_user WHERE user_id = @test1_id LIMIT 1);
SET @test2_nickname := (SELECT nickname FROM app_user WHERE user_id = @test2_id LIMIT 1);

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

INSERT INTO couple_room (
    room_code, room_code_expires_at, dating_start_date, status, created_at, updated_at
)
SELECT
    CONCAT('DASH-', LEFT(REPLACE(UUID(), '-', ''), 27)),
    NULL,
    DATE_SUB(CURDATE(), INTERVAL 100 DAY),
    'ACTIVE', NOW(), NOW()
WHERE @room_id IS NULL
  AND @test1_id IS NOT NULL
  AND @test2_id IS NOT NULL;

SET @created_room_id := IF(ROW_COUNT() = 1, LAST_INSERT_ID(), NULL);
SET @room_id := COALESCE(@room_id, @created_room_id);

UPDATE couple_room
SET status = 'ACTIVE',
    dating_start_date = COALESCE(dating_start_date, DATE_SUB(CURDATE(), INTERVAL 100 DAY)),
    updated_at = NOW()
WHERE room_id = @room_id;

INSERT INTO couple_member (
    room_id, user_id, partner_nickname, status, joined_at, left_at
)
SELECT @room_id, @test1_id, @test2_nickname, 'ACTIVE', NOW(), NULL
WHERE @room_id IS NOT NULL AND @test1_id IS NOT NULL
UNION ALL
SELECT @room_id, @test2_id, @test1_nickname, 'ACTIVE', NOW(), NULL
WHERE @room_id IS NOT NULL AND @test2_id IS NOT NULL
ON DUPLICATE KEY UPDATE
    partner_nickname = VALUES(partner_nickname),
    status = 'ACTIVE',
    left_at = NULL;

SELECT @test1_id AS test1_user_id, @test2_id AS test2_user_id, @room_id AS room_id;

-- ---------------------------------------------------------------------------
-- 1. 기존 더미 메시지 제거
--
-- message_id는 AUTO_INCREMENT라 ON DUPLICATE KEY UPDATE로는 절대 재정렬되지 않는다.
-- 이미 잘못된 순서로 들어간 행이 있으면 반드시 지우고 다시 넣어야 한다.
-- 삭제 대상은 client_message_id가 'd3000000-%' / 'd4000000-%'인 더미 행뿐이며,
-- 실제 사용자 메시지는 건드리지 않는다.
-- ---------------------------------------------------------------------------
SET SQL_SAFE_UPDATES = 0;

-- 읽음 상태가 삭제될 메시지를 참조하고 있으면 FK 때문에 삭제가 막힌다.
DELETE FROM chat_read_state
WHERE room_id = @room_id;

DELETE reaction
FROM chat_reaction reaction
JOIN chat_message message ON message.message_id = reaction.message_id
WHERE message.room_id = @room_id
  AND (message.client_message_id LIKE 'd3000000-%'
       OR message.client_message_id LIKE 'd4000000-%');

DELETE bookmark
FROM chat_bookmark bookmark
JOIN chat_message message ON message.message_id = bookmark.message_id
WHERE message.room_id = @room_id
  AND (message.client_message_id LIKE 'd3000000-%'
       OR message.client_message_id LIKE 'd4000000-%');

DELETE image
FROM chat_message_image image
JOIN chat_message message ON message.message_id = image.message_id
WHERE message.room_id = @room_id
  AND (message.client_message_id LIKE 'd3000000-%'
       OR message.client_message_id LIKE 'd4000000-%');

DELETE analysis
FROM chat_analysis analysis
JOIN chat_message message ON message.message_id = analysis.message_id
WHERE message.room_id = @room_id
  AND (message.client_message_id LIKE 'd3000000-%'
       OR message.client_message_id LIKE 'd4000000-%');

DELETE FROM chat_message
WHERE room_id = @room_id
  AND (client_message_id LIKE 'd3000000-%'
       OR client_message_id LIKE 'd4000000-%');

-- ---------------------------------------------------------------------------
-- 2. 기준 시각
-- ---------------------------------------------------------------------------
SET @week_start  := DATE_SUB(CURDATE(), INTERVAL (DAYOFWEEK(CURDATE()) - 1) DAY);
SET @month_start := DATE_SUB(CURDATE(), INTERVAL (DAY(CURDATE()) - 1) DAY);
SET @year_start  := MAKEDATE(YEAR(CURDATE()), 1);

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

-- ---------------------------------------------------------------------------
-- 3. chat_message 통합 INSERT
-- ---------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_dummy_messages;

CREATE TEMPORARY TABLE tmp_dummy_messages (
    sender_id          BIGINT NOT NULL,
    client_message_id  VARCHAR(64)  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    message_type       VARCHAR(16)  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    content             VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    sent_at             DATETIME NOT NULL
) ENGINE = InnoDB;

-- 3-1. 35일치 아침/저녁 리포트 대화를 임시 테이블에 적재
INSERT INTO tmp_dummy_messages (sender_id, client_message_id, message_type, content, sent_at)
WITH RECURSIVE report_days AS (
    SELECT 0 AS day_offset
    UNION ALL
    SELECT day_offset + 1 FROM report_days WHERE day_offset < 34
),
message_slots AS (
    SELECT 1 AS slot_number, '08:30:00' AS message_time
    UNION ALL SELECT 2, '08:34:00'
    UNION ALL SELECT 3, '08:38:00'
    UNION ALL SELECT 4, '08:42:00'
    UNION ALL SELECT 5, '20:00:00'
    UNION ALL SELECT 6, '20:04:00'
    UNION ALL SELECT 7, '20:08:00'
    UNION ALL SELECT 8, '20:12:00'
)
SELECT
    CASE WHEN MOD(message_slots.slot_number, 2) = 1
         THEN @test1_id ELSE @test2_id END AS sender_id,
    CONCAT(
        'd4000000-0000-0000-0000-',
        DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL report_days.day_offset DAY), '%Y%m%d'),
        LPAD(message_slots.slot_number, 4, '0')
    ) AS client_message_id,
    'TEXT' AS message_type,
    CASE message_slots.slot_number
        WHEN 1 THEN CASE MOD(report_days.day_offset, 7)
            WHEN 0 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '좋은 아침 오늘도 사랑해'
                WHEN 1 THEN '굿모닝 오늘도 사랑해'
                WHEN 2 THEN '좋은 아침이야 잘 잤어?'
                WHEN 3 THEN '일어났어? 오늘도 사랑해'
                ELSE '아침이다 오늘 하루도 파이팅'
            END
            WHEN 1 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '오늘 회의가 많아서 벌써 지친다'
                WHEN 1 THEN '오늘 일정이 빡빡해서 벌써 피곤하다'
                WHEN 2 THEN '오전부터 미팅이 몰려서 정신없어'
                WHEN 3 THEN '오늘따라 할 일이 산더미다'
                ELSE '아침부터 처리할 게 너무 많다'
            END
            WHEN 2 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '이번 주말에 어디로 갈까?'
                WHEN 1 THEN '이번 주말에는 뭐 하고 놀까?'
                WHEN 2 THEN '주말에 시간 되면 나갈까?'
                WHEN 3 THEN '이번 주말 계획 있어?'
                ELSE '주말에 어디 가고 싶은 데 있어?'
            END
            WHEN 3 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '어제 답장이 없어서 조금 서운했어'
                WHEN 1 THEN '어제 연락이 늦어서 좀 섭섭했어'
                WHEN 2 THEN '어제 톡 씹혀서 살짝 서운했어'
                WHEN 3 THEN '어제 답장 안 와서 신경 쓰였어'
                ELSE '어제 조용해서 무슨 일 있나 걱정했어'
            END
            WHEN 4 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '오늘 퇴근하고 잠깐 볼 수 있어?'
                WHEN 1 THEN '오늘 저녁에 시간 잠깐 될까?'
                WHEN 2 THEN '이따 끝나고 얼굴 볼 수 있어?'
                WHEN 3 THEN '오늘 저녁에 잠깐 만날래?'
                ELSE '퇴근하고 잠깐이라도 보자'
            END
            WHEN 5 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '어제 그렇게 말한 건 진짜 화났어'
                WHEN 1 THEN '어제 그 말 진짜 서운하고 화났어'
                WHEN 2 THEN '솔직히 어제 말투 때문에 화났었어'
                WHEN 3 THEN '어제 그렇게 말할 줄 몰랐어 화났어'
                ELSE '어제 일 아직도 좀 화 안 풀렸어'
            END
            WHEN 6 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '오늘 점심은 뭐 먹었어?'
                WHEN 1 THEN '점심은 뭐 먹었어 맛있었어?'
                WHEN 2 THEN '오늘 밥은 챙겨 먹었어?'
                WHEN 3 THEN '점심 뭐 시켰어?'
                ELSE '오늘 점심 메뉴 뭐였어?'
            END
        END
        WHEN 2 THEN CASE MOD(report_days.day_offset, 7)
            WHEN 0 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '나도 사랑해 오늘도 행복하게 보내자'
                WHEN 1 THEN '나도 사랑해 오늘 하루도 힘내자'
                WHEN 2 THEN '나도야 오늘도 좋은 하루 보내'
                WHEN 3 THEN '나도 사랑해 오늘도 웃으면서 지내자'
                ELSE '나도 많이 사랑해 좋은 하루 돼'
            END
            WHEN 1 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '많이 힘들겠다 무리하지 말고 쉬어가면서 해'
                WHEN 1 THEN '고생 많다 너무 무리하지는 마'
                WHEN 2 THEN '힘들겠다 잠깐씩이라도 쉬어가면서 해'
                WHEN 3 THEN '많이 바쁘구나 무리하지 말고 천천히 해'
                ELSE '고생이 많네 밥은 꼭 챙겨 먹고 해'
            END
            WHEN 2 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '바다 보러 가는 건 어때?'
                WHEN 1 THEN '바다 쪽으로 드라이브 가는 거 어때?'
                WHEN 2 THEN '이번엔 바다 보러 갈까?'
                WHEN 3 THEN '바닷가 쪽으로 가보는 건 어때?'
                ELSE '탁 트인 바다 보러 갈까?'
            END
            WHEN 3 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '미안해 정신없어서 확인을 못 했어'
                WHEN 1 THEN '미안 너무 바빠서 못 봤어'
                WHEN 2 THEN '미안해 알림을 못 봤나 봐'
                WHEN 3 THEN '미안 정신없어서 답장이 늦었어'
                ELSE '미안해 일하느라 폰을 못 봤어'
            END
            WHEN 4 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '갑자기 무슨 일 있어?'
                WHEN 1 THEN '왜 갑자기 그래 무슨 일이야?'
                WHEN 2 THEN '무슨 일 있어 갑자기?'
                WHEN 3 THEN '갑자기 왜 그래?'
                ELSE '어 왜 갑자기 그래 무슨 일이야'
            END
            WHEN 5 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '내가 너무 심하게 말했어 미안해'
                WHEN 1 THEN '내 말투가 심했어 미안해'
                WHEN 2 THEN '아까 내가 좀 심했다 미안해'
                WHEN 3 THEN '말이 너무 세게 나갔어 미안해'
                ELSE '내가 너무 예민하게 굴었어 미안해'
            END
            WHEN 6 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '회사 앞에서 김치찌개 먹었어'
                WHEN 1 THEN '회사 근처에서 국밥 먹었어'
                WHEN 2 THEN '오늘은 회사 앞 분식집 갔어'
                WHEN 3 THEN '점심에 회사 앞에서 백반 먹었어'
                ELSE '회사 앞 카페에서 샌드위치로 때웠어'
            END
        END
        WHEN 3 THEN CASE MOD(report_days.day_offset, 7)
            WHEN 0 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '오늘 저녁에 맛있는 거 같이 먹자'
                WHEN 1 THEN '오늘 저녁 맛있는 거 먹으러 가자'
                WHEN 2 THEN '저녁에 맛집 가서 먹자'
                WHEN 3 THEN '오늘 저녁은 맛있는 거 먹자'
                ELSE '저녁에 좋아하는 거 먹으러 가자'
            END
            WHEN 1 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '네 말 들으니까 마음이 좀 놓인다'
                WHEN 1 THEN '그 말 들으니 한결 편해졌어'
                WHEN 2 THEN '네 덕분에 마음이 놓이네'
                WHEN 3 THEN '그렇게 말해 주니까 안심이 돼'
                ELSE '네 말 들으니까 좀 나아졌어'
            END
            WHEN 2 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '좋다 벌써부터 설렌다'
                WHEN 1 THEN '좋아 벌써 기대된다'
                WHEN 2 THEN '완전 좋다 벌써 두근거려'
                WHEN 3 THEN '기대된다 벌써 설레'
                ELSE '좋아 생각만 해도 설레'
            END
            WHEN 3 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '연락이 안 되니까 많이 속상했어'
                WHEN 1 THEN '연락이 끊겨서 진짜 속상했어'
                WHEN 2 THEN '전화도 안 받아서 많이 서운했어'
                WHEN 3 THEN '연락이 없어서 계속 신경 쓰였어'
                ELSE '답이 없어서 혼자 많이 걱정했어'
            END
            WHEN 4 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '깜짝 선물이 있어서 그래'
                WHEN 1 THEN '너 주려고 준비한 게 있어서'
                WHEN 2 THEN '깜짝 놀랄 일이 있어서 그래'
                WHEN 3 THEN '준비한 게 있어서 그래'
                ELSE '너한테 줄 게 있어서 그랬어'
            END
            WHEN 5 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '이러다 또 싸울까 봐 걱정돼'
                WHEN 1 THEN '또 다툴까 봐 조마조마해'
                WHEN 2 THEN '이러다 또 감정 상할까 봐 걱정돼'
                WHEN 3 THEN '이번에도 또 이럴까 봐 불안해'
                ELSE '또 이런 일 생길까 봐 걱정돼'
            END
            WHEN 6 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '나는 그냥 편의점에서 때웠어'
                WHEN 1 THEN '난 그냥 편의점 도시락 먹었어'
                WHEN 2 THEN '오늘은 그냥 라면으로 때웠어'
                WHEN 3 THEN '나는 대충 삼각김밥으로 때웠어'
                ELSE '난 그냥 빵으로 대충 먹었어'
            END
        END
        WHEN 4 THEN CASE MOD(report_days.day_offset, 7)
            WHEN 0 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '좋아 저녁에 뭐 먹을지 같이 고르자'
                WHEN 1 THEN '좋아 저녁 메뉴 같이 정하자'
                WHEN 2 THEN '콜 저녁에 뭐 먹을지 고민해보자'
                WHEN 3 THEN '좋아 이따 메뉴 같이 골라보자'
                ELSE '좋다 저녁 뭐 먹을지 같이 정하자'
            END
            WHEN 1 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '힘든 일 있으면 언제든지 나한테 말해'
                WHEN 1 THEN '힘들면 언제든 나한테 얘기해'
                WHEN 2 THEN '무슨 일 있으면 바로 말해줘'
                WHEN 3 THEN '혼자 참지 말고 나한테 말해'
                ELSE '힘든 거 있으면 참지 말고 얘기해'
            END
            WHEN 2 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '숙소는 내가 알아볼게'
                WHEN 1 THEN '숙소는 내가 찾아볼게'
                WHEN 2 THEN '숙소 예약은 내가 할게'
                WHEN 3 THEN '묵을 곳은 내가 찾아볼게'
                ELSE '숙소 알아보는 건 내가 맡을게'
            END
            WHEN 3 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '앞으로는 꼭 미리 말할게 미안해'
                WHEN 1 THEN '다음부터는 미리 얘기할게 미안해'
                WHEN 2 THEN '앞으로 이런 일 없게 미리 말할게'
                WHEN 3 THEN '이제부터 꼭 먼저 알려줄게 미안'
                ELSE '다음엔 꼭 미리 말해줄게 미안해'
            END
            WHEN 4 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '헐 진짜 깜짝 놀랐어'
                WHEN 1 THEN '헐 완전 놀랐잖아'
                WHEN 2 THEN '와 진짜 깜짝이야'
                WHEN 3 THEN '헐 진짜 놀랐어 심장 떨어질 뻔'
                ELSE '와 이거 진짜 예상 못 했어'
            END
            WHEN 5 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '그럴 일 없게 내가 더 조심할게'
                WHEN 1 THEN '앞으로 더 조심할게 걱정 마'
                WHEN 2 THEN '내가 더 신경 써서 조심할게'
                WHEN 3 THEN '이제 말 조심할게 미안해'
                ELSE '앞으로는 더 신중하게 말할게'
            END
            WHEN 6 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '끼니 거르지 말고 잘 챙겨 먹어'
                WHEN 1 THEN '밥 거르지 말고 꼭 챙겨 먹어'
                WHEN 2 THEN '끼니 거르지 말고 든든히 먹어'
                WHEN 3 THEN '밥때 놓치지 말고 챙겨 먹어'
                ELSE '끼니는 꼭 챙겨 먹고 다녀'
            END
        END
        WHEN 5 THEN CASE MOD(report_days.day_offset, 7)
            WHEN 0 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '오늘 저녁 데이트 정말 즐거웠어'
                WHEN 1 THEN '오늘 데이트 진짜 즐거웠어'
                WHEN 2 THEN '오늘 만나서 너무 좋았어'
                WHEN 3 THEN '오늘 저녁 시간 정말 좋았어'
                ELSE '오늘 같이 있어서 정말 즐거웠어'
            END
            WHEN 1 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '오늘 일이 많아서 정말 힘들었어'
                WHEN 1 THEN '오늘 진짜 정신없이 힘들었어'
                WHEN 2 THEN '오늘따라 유독 힘든 하루였어'
                WHEN 3 THEN '오늘 일이 많아서 지쳤어'
                ELSE '오늘 하루 진짜 고됐어'
            END
            WHEN 2 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '기차표는 몇 시로 예매할까?'
                WHEN 1 THEN '기차는 몇 시 걸로 예매할까?'
                WHEN 2 THEN '표는 오전이랑 오후 중 뭐가 나아?'
                WHEN 3 THEN '기차표 예매는 언제 할까?'
                ELSE '몇 시 기차로 예매하는 게 좋을까?'
            END
            WHEN 3 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '오늘은 네 얼굴 보니까 마음이 풀렸어'
                WHEN 1 THEN '얼굴 보니까 화가 좀 풀리네'
                WHEN 2 THEN '너 보니까 마음이 좀 놓였어'
                WHEN 3 THEN '얼굴 보니까 서운했던 게 풀렸어'
                ELSE '오늘 보니까 마음이 한결 편해졌어'
            END
            WHEN 4 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '마음에 든다니 나도 좋다'
                WHEN 1 THEN '좋아해 주니까 나도 기쁘다'
                WHEN 2 THEN '마음에 들어 한다니 나도 뿌듯해'
                WHEN 3 THEN '좋아하니까 나도 덩달아 기분 좋다'
                ELSE '마음에 든다니 준비한 보람 있다'
            END
            WHEN 5 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '오늘은 좀 진정하고 얘기하자'
                WHEN 1 THEN '오늘은 서로 진정하고 얘기하자'
                WHEN 2 THEN '일단 좀 가라앉히고 얘기하자'
                WHEN 3 THEN '오늘은 차분하게 얘기 좀 하자'
                ELSE '조금 진정된 다음에 얘기하자'
            END
            WHEN 6 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '저녁에는 뭐 하고 있었어?'
                WHEN 1 THEN '저녁 시간에 뭐 하고 있었어?'
                WHEN 2 THEN '아까 저녁엔 뭐 했어?'
                WHEN 3 THEN '저녁 먹고 나서 뭐 했어?'
                ELSE '저녁에 뭐 하느라 바빴어?'
            END
        END
        WHEN 6 THEN CASE MOD(report_days.day_offset, 7)
            WHEN 0 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '나도 즐거웠어 다음에 또 데이트하자'
                WHEN 1 THEN '나도 좋았어 다음에 또 만나자'
                WHEN 2 THEN '나도 즐거웠어 또 이렇게 만나자'
                WHEN 3 THEN '나도 좋았어 다음에도 이렇게 보내자'
                ELSE '나도 재밌었어 다음에 또 놀자'
            END
            WHEN 1 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '오늘 고생 많았어 푹 쉬어'
                WHEN 1 THEN '오늘 수고 많았어 푹 쉬어'
                WHEN 2 THEN '오늘 고생했어 얼른 쉬어'
                WHEN 3 THEN '오늘 정말 고생했어 푹 자'
                ELSE '오늘 애썼어 이제 좀 쉬어'
            END
            WHEN 2 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '아침 일찍 출발하는 게 좋을 것 같아'
                WHEN 1 THEN '일찍 출발하는 게 나을 것 같아'
                WHEN 2 THEN '아침 일찍 나서는 게 좋겠어'
                WHEN 3 THEN '조금 서둘러서 출발하는 게 좋겠다'
                ELSE '아침 일찍 움직이는 게 편할 것 같아'
            END
            WHEN 3 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '그렇게 말해 줘서 고마워'
                WHEN 1 THEN '그렇게 이해해 줘서 고마워'
                WHEN 2 THEN '그런 말 해줘서 정말 고마워'
                WHEN 3 THEN '먼저 그렇게 말해줘서 고마워'
                ELSE '그렇게 생각해 줘서 고마워'
            END
            WHEN 4 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '이런 거 받으니까 좀 부끄럽다'
                WHEN 1 THEN '이런 거 받으니까 쑥스럽네'
                WHEN 2 THEN '갑자기 받으니까 좀 부끄러워'
                WHEN 3 THEN '이렇게 챙겨주니까 부끄럽다'
                ELSE '이런 서프라이즈는 좀 부끄럽네'
            END
            WHEN 5 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '응 천천히 얘기하면 괜찮아질 거야'
                WHEN 1 THEN '응 시간 지나면 괜찮아질 거야'
                WHEN 2 THEN '천천히 풀어가면 괜찮아질 거야'
                WHEN 3 THEN '응 조금씩 얘기하면 나아질 거야'
                ELSE '괜찮아질 거야 천천히 얘기하자'
            END
            WHEN 6 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '드라마 보다가 깜빡 잠들었어'
                WHEN 1 THEN '영화 보다가 나도 모르게 잠들었어'
                WHEN 2 THEN '드라마 보다가 스르륵 잠들어버렸어'
                WHEN 3 THEN '누워서 보다가 깜빡 졸았어'
                ELSE '드라마 틀어놓고 잠들어 버렸어'
            END
        END
        WHEN 7 THEN CASE MOD(report_days.day_offset, 7)
            WHEN 0 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '늘 옆에 있어 줘서 고마워'
                WHEN 1 THEN '항상 곁에 있어 줘서 고마워'
                WHEN 2 THEN '늘 함께해 줘서 정말 고마워'
                WHEN 3 THEN '항상 내 옆에 있어줘서 고마워'
                ELSE '늘 곁에서 챙겨줘서 고마워'
            END
            WHEN 1 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '위로해 줘서 고마워 마음이 편해졌어'
                WHEN 1 THEN '위로해 줘서 고마워 마음이 놓였어'
                WHEN 2 THEN '따뜻하게 위로해 줘서 고마워'
                WHEN 3 THEN '위로 덕분에 마음이 한결 편해졌어'
                ELSE '위로해줘서 고마워 힘이 났어'
            END
            WHEN 2 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '숙소랑 가고 싶은 곳을 몇 군데 찾아볼게'
                WHEN 1 THEN '숙소랑 갈 만한 곳 좀 찾아볼게'
                WHEN 2 THEN '숙소랑 코스 몇 개 찾아볼게'
                WHEN 3 THEN '숙소랑 근처 볼거리 찾아볼게'
                ELSE '숙소랑 맛집 몇 군데 찾아볼게'
            END
            WHEN 3 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '앞으로 서운한 건 바로 말할게'
                WHEN 1 THEN '이제 서운하면 바로 얘기할게'
                WHEN 2 THEN '앞으로는 참지 않고 바로 말할게'
                WHEN 3 THEN '서운한 게 있으면 바로바로 말할게'
                ELSE '앞으로 쌓아두지 않고 바로 얘기할게'
            END
            WHEN 4 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '부끄러워하는 것도 귀엽네'
                WHEN 1 THEN '부끄러워하는 모습 진짜 귀엽다'
                WHEN 2 THEN '그렇게 부끄러워하니까 더 귀여워'
                WHEN 3 THEN '부끄러워하는 거 너무 귀엽다'
                ELSE '수줍어하는 모습이 귀엽네'
            END
            WHEN 5 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '풀려서 다행이다 사실 많이 속상했어'
                WHEN 1 THEN '풀려서 다행이야 사실 나도 힘들었어'
                WHEN 2 THEN '이제라도 풀려서 다행이다'
                WHEN 3 THEN '다행이다 사실 계속 신경 쓰였어'
                ELSE '풀려서 다행이야 마음이 좀 놓인다'
            END
            WHEN 6 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '피곤했나 보다 오늘도 고생했어'
                WHEN 1 THEN '많이 피곤했구나 오늘도 고생했어'
                WHEN 2 THEN '피곤했나 봐 오늘 하루도 고생 많았어'
                WHEN 3 THEN '지쳤나 보다 오늘도 애썼어'
                ELSE '피곤했나 보네 오늘도 수고했어'
            END
        END
        WHEN 8 THEN CASE MOD(report_days.day_offset, 7)
            WHEN 0 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '나야말로 고마워 오늘도 잘 자'
                WHEN 1 THEN '나야말로 고마워 오늘도 잘 자고'
                WHEN 2 THEN '내가 더 고마워 잘 자 오늘도'
                WHEN 3 THEN '나야말로 고마웠어 오늘도 잘 자'
                ELSE '고마운 건 나야 오늘도 잘 자'
            END
            WHEN 1 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '오늘은 일찍 쉬고 내일은 더 좋은 하루 보내자'
                WHEN 1 THEN '오늘은 푹 쉬고 내일은 힘내자'
                WHEN 2 THEN '오늘은 일찍 자고 내일 더 잘해보자'
                WHEN 3 THEN '오늘은 쉬고 내일 다시 힘내자'
                ELSE '오늘은 편히 쉬고 내일 좋게 보내자'
            END
            WHEN 2 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '응 우리 같이 계획하면 재미있을 것 같아'
                WHEN 1 THEN '응 같이 짜면 진짜 재밌을 것 같아'
                WHEN 2 THEN '응 함께 계획하면 더 신날 것 같아'
                WHEN 3 THEN '응 같이 준비하면 재밌겠다'
                ELSE '응 우리끼리 짜면 더 재미있을 거야'
            END
            WHEN 3 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '응 나도 더 신경 쓸게 잘 자'
                WHEN 1 THEN '응 나도 더 챙길게 잘 자'
                WHEN 2 THEN '응 나도 노력할게 잘 자'
                WHEN 3 THEN '응 나도 더 조심할게 잘 자'
                ELSE '응 나도 더 신경쓸게 오늘도 잘 자'
            END
            WHEN 4 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '그만 놀려 얼굴 빨개졌잖아'
                WHEN 1 THEN '그만 놀려 얼굴 빨개지잖아'
                WHEN 2 THEN '놀리지 마 진짜 부끄럽잖아'
                WHEN 3 THEN '그만해 얼굴 다 빨개졌어'
                ELSE '놀리지 마 얼굴 화끈거려'
            END
            WHEN 5 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '마음 아프게 해서 미안해 앞으로 잘할게'
                WHEN 1 THEN '속상하게 해서 미안해 앞으로 잘할게'
                WHEN 2 THEN '마음 아프게 한 거 미안해 잘할게'
                WHEN 3 THEN '힘들게 해서 미안해 더 잘할게'
                ELSE '아프게 해서 미안해 앞으로 노력할게'
            END
            WHEN 6 THEN CASE FLOOR(report_days.day_offset / 7)
                WHEN 0 THEN '챙겨 줘서 고마워 내일 봐'
                WHEN 1 THEN '챙겨줘서 고마워 내일 또 보자'
                WHEN 2 THEN '오늘도 챙겨줘서 고마워 내일 봐'
                WHEN 3 THEN '챙겨줘서 고마워 내일 얘기하자'
                ELSE '고마워 챙겨줘서 내일 또 봐'
            END
        END
    END AS content,
    -- 슬롯 간격 4분 + 0~2분 지터. 지터가 최대 2분이라 슬롯 순서는 항상 유지된다.
    DATE_ADD(
        TIMESTAMP(
            DATE_SUB(CURDATE(), INTERVAL report_days.day_offset DAY),
            message_slots.message_time
        ),
        INTERVAL MOD(report_days.day_offset + message_slots.slot_number, 3) MINUTE
    ) AS sent_at
FROM report_days
CROSS JOIN message_slots
WHERE @room_id IS NOT NULL
  AND @test1_id IS NOT NULL
  AND @test2_id IS NOT NULL
  AND DATE_ADD(
        TIMESTAMP(
            DATE_SUB(CURDATE(), INTERVAL report_days.day_offset DAY),
            message_slots.message_time
        ),
        INTERVAL MOD(report_days.day_offset + message_slots.slot_number, 3) MINUTE
      ) <= NOW();

-- 3-2. 최근 100분 이내 스팟 대화(카페 대화, 주간/월간/연간 대표 대화, 이미지 2건)를
--      같은 임시 테이블에 적재.
INSERT INTO tmp_dummy_messages (sender_id, client_message_id, message_type, content, sent_at)
VALUES
    (@test1_id, 'd3000000-0000-0000-0000-000000000001', 'TEXT',  '오늘 저녁에 같이 맛있는 저녁 먹자', DATE_SUB(NOW(), INTERVAL 100 MINUTE)),
    (@test2_id, 'd3000000-0000-0000-0000-000000000002', 'TEXT',  '좋아 오늘 정말 기대된다',                DATE_SUB(NOW(), INTERVAL 94 MINUTE)),
    (@test1_id, 'd3000000-0000-0000-0000-000000000003', 'TEXT',  '어떤 메뉴가 먹고 싶어?',                  DATE_SUB(NOW(), INTERVAL 88 MINUTE)),
    (@test2_id, 'd3000000-0000-0000-0000-000000000004', 'TEXT',  '나는 파스타가 먹고 싶어',                  DATE_SUB(NOW(), INTERVAL 81 MINUTE)),
    (@test1_id, 'd3000000-0000-0000-0000-000000000005', 'TEXT',  '예약할 수 있는지 알아볼게',                 DATE_SUB(NOW(), INTERVAL 74 MINUTE)),
    (@test2_id, 'd3000000-0000-0000-0000-000000000006', 'TEXT',  '항상 챙겨줘서 고마워',                     DATE_SUB(NOW(), INTERVAL 68 MINUTE)),
    (@test1_id, 'd3000000-0000-0000-0000-000000000007', 'TEXT',  '오늘 일이 많아서 조금 걱정돼',               DATE_SUB(NOW(), INTERVAL 55 MINUTE)),
    (@test2_id, 'd3000000-0000-0000-0000-000000000008', 'TEXT',  '천천히 해도 괜찮아 내가 응원할게',             DATE_SUB(NOW(), INTERVAL 48 MINUTE)),
    (@test1_id, 'd3000000-0000-0000-0000-000000000009', 'TEXT',  '그 말 들으니까 마음이 편안해졌어',             DATE_SUB(NOW(), INTERVAL 35 MINUTE)),
    (@test2_id, 'd3000000-0000-0000-0000-000000000010', 'TEXT',  '우리 오늘도 즐겁게 보내자',                  DATE_SUB(NOW(), INTERVAL 28 MINUTE)),

    (@test1_id, 'd3000000-0000-0000-0000-000000000011', 'TEXT',  '이번 주말에 데이트 어디로 갈까?',              @week_time),
    (@test2_id, 'd3000000-0000-0000-0000-000000000012', 'TEXT',  '한강 산책하면 즐거울 것 같아',                DATE_ADD(@week_time, INTERVAL 8 MINUTE)),
    (@test1_id, 'd3000000-0000-0000-0000-000000000013', 'TEXT',  '날씨가 좋으면 사진도 많이 찍자',               DATE_ADD(@week_time, INTERVAL 16 MINUTE)),
    (@test2_id, 'd3000000-0000-0000-0000-000000000014', 'TEXT',  '벌써부터 설레고 기대돼',                     DATE_ADD(@week_time, INTERVAL 23 MINUTE)),

    (@test1_id, 'd3000000-0000-0000-0000-000000000015', 'TEXT',  '이번 달에는 같이 영화도 많이 봤네',             @month_time),
    (@test2_id, 'd3000000-0000-0000-0000-000000000016', 'TEXT',  '같이 보내는 시간이 정말 좋아',                DATE_ADD(@month_time, INTERVAL 5 MINUTE)),
    (@test1_id, 'd3000000-0000-0000-0000-000000000017', 'TEXT',  '내가 늦어서 미안해',                        DATE_ADD(@month_time, INTERVAL 12 MINUTE)),
    (@test2_id, 'd3000000-0000-0000-0000-000000000018', 'TEXT',  '괜찮아 다음에는 미리 알려줘',                 DATE_ADD(@month_time, INTERVAL 19 MINUTE)),

    (@test1_id, 'd3000000-0000-0000-0000-000000000019', 'TEXT',  '올해 처음 만났던 날 기억나?',                 @year_time),
    (@test2_id, 'd3000000-0000-0000-0000-000000000020', 'TEXT',  '당연하지 그날 정말 행복했어',                 DATE_ADD(@year_time, INTERVAL 6 MINUTE)),
    (@test1_id, 'd3000000-0000-0000-0000-000000000021', 'TEXT',  '앞으로도 좋은 추억 많이 만들자',               DATE_ADD(@year_time, INTERVAL 13 MINUTE)),
    (@test2_id, 'd3000000-0000-0000-0000-000000000022', 'TEXT',  '늘 함께해 줘서 고마워 사랑해',                DATE_ADD(@year_time, INTERVAL 20 MINUTE)),

    (@test1_id, 'd3000000-0000-0000-0000-000000000023', 'IMAGE', NULL, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
    (@test2_id, 'd3000000-0000-0000-0000-000000000024', 'IMAGE', NULL, DATE_SUB(NOW(), INTERVAL 12 MINUTE));


-- 3-3. 임시 테이블 하나에서만 SELECT하므로 UNION이 없다 -> 콜레이션 충돌 불가능
INSERT INTO chat_message (
    room_id, sender_id, client_message_id, message_type, content, sent_at
)
SELECT
    @room_id,
    tmp.sender_id,
    tmp.client_message_id,
    tmp.message_type,
    tmp.content,
    tmp.sent_at
FROM tmp_dummy_messages tmp
ORDER BY tmp.sent_at, tmp.client_message_id
ON DUPLICATE KEY UPDATE
    room_id      = VALUES(room_id),
    message_type = VALUES(message_type),
    content      = VALUES(content),
    sent_at      = VALUES(sent_at);

DROP TEMPORARY TABLE IF EXISTS tmp_dummy_messages;


-- ---------------------------------------------------------------------------
-- 4. 스팟 대화(d3) 감정 분석 결과
-- ---------------------------------------------------------------------------
INSERT INTO chat_analysis (
    message_id, emotion_type, analysis_status, analyzed_at, created_at
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
        WHEN 'd3000000-0000-0000-0000-000000000015' THEN 'JOY'
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
WHERE message.room_id = @room_id
  AND message.message_type = 'TEXT'
  AND message.client_message_id BETWEEN
      'd3000000-0000-0000-0000-000000000001'
      AND 'd3000000-0000-0000-0000-000000000022'
ON DUPLICATE KEY UPDATE
    emotion_type = VALUES(emotion_type),
    analysis_status = 'COMPLETED',
    analyzed_at = VALUES(analyzed_at);

-- ---------------------------------------------------------------------------
-- 5. 리포트 대화(d4) 감정 분석 결과
-- ---------------------------------------------------------------------------
INSERT INTO chat_analysis (
    message_id, emotion_type, analysis_status, analyzed_at, created_at
)
WITH RECURSIVE report_days AS (
    SELECT 0 AS day_offset
    UNION ALL
    SELECT day_offset + 1 FROM report_days WHERE day_offset < 34
),
message_slots AS (
    SELECT 1 AS slot_number
    UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
),
generated_ids AS (
    SELECT
        report_days.day_offset,
        message_slots.slot_number,
        CONCAT(
            'd4000000-0000-0000-0000-',
            DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL report_days.day_offset DAY), '%Y%m%d'),
            LPAD(message_slots.slot_number, 4, '0')
        ) AS client_message_id
    FROM report_days
    CROSS JOIN message_slots
)
SELECT
    message.message_id,
    CASE report_id.slot_number
        WHEN 1 THEN CASE MOD(report_id.day_offset, 7)
            WHEN 0 THEN 'JOY'       WHEN 1 THEN 'DISTRESS'  WHEN 2 THEN 'CURIOSITY'
            WHEN 3 THEN 'HURT'      WHEN 4 THEN 'CURIOSITY' WHEN 5 THEN 'ANGER'
            ELSE 'CURIOSITY' END
        WHEN 2 THEN CASE MOD(report_id.day_offset, 7)
            WHEN 0 THEN 'JOY'       WHEN 1 THEN 'COMFORT'   WHEN 2 THEN 'CURIOSITY'
            WHEN 3 THEN 'APOLOGY'   WHEN 4 THEN 'SURPRISE'  WHEN 5 THEN 'APOLOGY'
            ELSE 'NEUTRAL' END
        WHEN 3 THEN CASE MOD(report_id.day_offset, 7)
            WHEN 0 THEN 'EXCITEMENT' WHEN 1 THEN 'COMFORT'  WHEN 2 THEN 'EXCITEMENT'
            WHEN 3 THEN 'SADNESS'    WHEN 4 THEN 'EXCITEMENT' WHEN 5 THEN 'WORRY'
            ELSE 'NEUTRAL' END
        WHEN 4 THEN CASE MOD(report_id.day_offset, 7)
            WHEN 0 THEN 'EXCITEMENT' WHEN 1 THEN 'COMFORT'  WHEN 2 THEN 'NEUTRAL'
            WHEN 3 THEN 'APOLOGY'    WHEN 4 THEN 'SURPRISE' WHEN 5 THEN 'COMFORT'
            ELSE 'WORRY' END
        WHEN 5 THEN CASE MOD(report_id.day_offset, 7)
            WHEN 0 THEN 'JOY'        WHEN 1 THEN 'DISTRESS' WHEN 2 THEN 'CURIOSITY'
            WHEN 3 THEN 'COMFORT'    WHEN 4 THEN 'JOY'      WHEN 5 THEN 'NEUTRAL'
            ELSE 'CURIOSITY' END
        WHEN 6 THEN CASE MOD(report_id.day_offset, 7)
            WHEN 0 THEN 'JOY'        WHEN 1 THEN 'COMFORT'  WHEN 2 THEN 'NEUTRAL'
            WHEN 3 THEN 'GRATITUDE'  WHEN 4 THEN 'SHYNESS'  WHEN 5 THEN 'COMFORT'
            ELSE 'EMBARRASSMENT' END
        WHEN 7 THEN CASE MOD(report_id.day_offset, 7)
            WHEN 0 THEN 'GRATITUDE'  WHEN 1 THEN 'GRATITUDE' WHEN 2 THEN 'EXCITEMENT'
            WHEN 3 THEN 'NEUTRAL'    WHEN 4 THEN 'SHYNESS'   WHEN 5 THEN 'SADNESS'
            ELSE 'COMFORT' END
        ELSE CASE MOD(report_id.day_offset, 7)
            WHEN 0 THEN 'GRATITUDE'  WHEN 1 THEN 'COMFORT'  WHEN 2 THEN 'EXCITEMENT'
            WHEN 3 THEN 'COMFORT'    WHEN 4 THEN 'EMBARRASSMENT' WHEN 5 THEN 'APOLOGY'
            ELSE 'GRATITUDE' END
    END,
    'COMPLETED',
    DATE_ADD(message.sent_at, INTERVAL 1 SECOND),
    message.sent_at
FROM generated_ids report_id
JOIN chat_message message
  ON message.client_message_id = report_id.client_message_id
 AND message.room_id = @room_id
ON DUPLICATE KEY UPDATE
    emotion_type = VALUES(emotion_type),
    analysis_status = 'COMPLETED',
    analyzed_at = VALUES(analyzed_at);

-- ---------------------------------------------------------------------------
-- 6. 이미지 / 공감 / 북마크
-- ---------------------------------------------------------------------------
INSERT INTO chat_message_image (message_id, image_url, display_order, created_at)
SELECT message_id, 'https://i15b208.p.ssafy.io/uploads/2026/08/10/07f735cfa03f42ac8cd72cc9d7a44822.jpg', 1, sent_at
FROM chat_message
WHERE room_id = @room_id AND client_message_id = 'd3000000-0000-0000-0000-000000000023'
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);

INSERT INTO chat_message_image (message_id, image_url, display_order, created_at)
SELECT message_id, 'https://i15b208.p.ssafy.io/uploads/2026/08/10/89f5c625b905431c89ac8cb0e110cab1.jpg', 2, sent_at
FROM chat_message
WHERE room_id = @room_id AND client_message_id = 'd3000000-0000-0000-0000-000000000023'
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);

-- .avif 확장자: 일부 웹뷰/이미지 로더에서 미지원일 수 있음. 화면에서 깨져
-- 보이면 이 파일만 jpg로 재업로드 후 URL 교체.
INSERT INTO chat_message_image (message_id, image_url, display_order, created_at)
SELECT message_id, 'https://i15b208.p.ssafy.io/uploads/2026/08/10/730470f2a14646a29f495983b6cd0f6a.avif', 1, sent_at
FROM chat_message
WHERE room_id = @room_id AND client_message_id = 'd3000000-0000-0000-0000-000000000024'
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);

INSERT INTO chat_reaction (room_id, user_id, message_id, reaction_type, created_at, updated_at)
SELECT @room_id, @test2_id, message_id, 'HEART', sent_at, sent_at
FROM chat_message
WHERE room_id = @room_id
  AND sender_id = @test1_id
  AND client_message_id IN (
      'd3000000-0000-0000-0000-000000000001',
      'd3000000-0000-0000-0000-000000000007',
      'd3000000-0000-0000-0000-000000000013'
  )
ON DUPLICATE KEY UPDATE
    reaction_type = VALUES(reaction_type),
    created_at = VALUES(created_at),
    updated_at = VALUES(updated_at);

INSERT INTO chat_reaction (room_id, user_id, message_id, reaction_type, created_at, updated_at)
SELECT @room_id, @test1_id, message_id, 'LOVE', sent_at, sent_at
FROM chat_message
WHERE room_id = @room_id
  AND sender_id = @test2_id
  AND client_message_id IN (
      'd3000000-0000-0000-0000-000000000006',
      'd3000000-0000-0000-0000-000000000014',
      'd3000000-0000-0000-0000-000000000022'
  )
ON DUPLICATE KEY UPDATE
    reaction_type = VALUES(reaction_type),
    created_at = VALUES(created_at),
    updated_at = VALUES(updated_at);

INSERT INTO chat_bookmark (room_id, user_id, message_id, created_at)
SELECT @room_id, @test1_id, message_id, sent_at
FROM chat_message
WHERE room_id = @room_id
  AND sender_id = @test2_id
  AND client_message_id IN (
      'd3000000-0000-0000-0000-000000000006',
      'd3000000-0000-0000-0000-000000000014',
      'd3000000-0000-0000-0000-000000000022'
  )
ON DUPLICATE KEY UPDATE created_at = VALUES(created_at);

INSERT INTO chat_bookmark (room_id, user_id, message_id, created_at)
SELECT @room_id, @test2_id, message_id, sent_at
FROM chat_message
WHERE room_id = @room_id
  AND sender_id = @test1_id
  AND client_message_id IN (
      'd3000000-0000-0000-0000-000000000001',
      'd3000000-0000-0000-0000-000000000013',
      'd3000000-0000-0000-0000-000000000021'
  )
ON DUPLICATE KEY UPDATE created_at = VALUES(created_at);

-- 날짜별 공감 개수 변화용: 매일 슬롯 8(두리의 마지막 메시지)에 공감
INSERT INTO chat_reaction (room_id, user_id, message_id, reaction_type, created_at, updated_at)
WITH RECURSIVE report_days AS (
    SELECT 0 AS day_offset
    UNION ALL
    SELECT day_offset + 1 FROM report_days WHERE day_offset < 34
),
generated_ids AS (
    SELECT
        report_days.day_offset,
        CONCAT(
            'd4000000-0000-0000-0000-',
            DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL report_days.day_offset DAY), '%Y%m%d'),
            '0008'
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
  ON message.client_message_id = report_id.client_message_id
 AND message.room_id = @room_id
 AND message.sender_id = @test2_id
ON DUPLICATE KEY UPDATE
    reaction_type = VALUES(reaction_type),
    created_at = VALUES(created_at),
    updated_at = VALUES(updated_at);

-- ---------------------------------------------------------------------------
-- 7. 무드 트래커 (원본 유지)
-- ---------------------------------------------------------------------------
INSERT INTO mood (room_id, user_id, mood_datetime, mood_type, reason, created_at, updated_at)
WITH RECURSIVE mood_days AS (
    SELECT 0 AS day_offset
    UNION ALL
    SELECT day_offset + 1 FROM mood_days WHERE day_offset < 34
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
            DATE_SUB(CURDATE(), INTERVAL mood_days.day_offset DAY),
            CASE members.member_number WHEN 0 THEN '09:00:00' ELSE '09:30:00' END
        ) AS mood_datetime
    FROM mood_days
    CROSS JOIN members
)
SELECT
    @room_id,
    report_mood.user_id,
    report_mood.mood_datetime,
    CASE MOD(report_mood.day_offset + report_mood.member_number, 5)
        WHEN 0 THEN 'VERY_HAPPY'
        WHEN 1 THEN 'HAPPY'
        WHEN 2 THEN 'NEUTRAL'
        WHEN 3 THEN 'SAD'
        ELSE 'VERY_SAD'
    END,
    CASE MOD(report_mood.day_offset + report_mood.member_number, 5)
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

-- ---------------------------------------------------------------------------
-- 8. 읽음 상태 (앞에서 지웠으므로 다시 생성)
-- ---------------------------------------------------------------------------
SET @latest_message_id := (
    SELECT message_id FROM chat_message
    WHERE room_id = @room_id
    ORDER BY sent_at DESC, message_id DESC
    LIMIT 1
);

INSERT INTO chat_read_state (room_id, user_id, last_read_message_id, read_at)
SELECT @room_id, @test1_id, @latest_message_id, NOW()
WHERE @room_id IS NOT NULL AND @test1_id IS NOT NULL AND @latest_message_id IS NOT NULL
UNION ALL
SELECT @room_id, @test2_id, @latest_message_id, NOW()
WHERE @room_id IS NOT NULL AND @test2_id IS NOT NULL AND @latest_message_id IS NOT NULL
ON DUPLICATE KEY UPDATE
    last_read_message_id = VALUES(last_read_message_id),
    read_at = VALUES(read_at);

SET SQL_SAFE_UPDATES = 1;

-- ---------------------------------------------------------------------------
-- 9. 대시보드 스냅샷 제거
-- ---------------------------------------------------------------------------
DELETE FROM member_dashboard WHERE room_id = @room_id;
DELETE FROM couple_dashboard WHERE room_id = @room_id;

-- ============================================================================
-- 검증 쿼리
-- ============================================================================

-- (1) 핵심 검증: message_id 순서와 sent_at 순서가 일치하는가?
--     out_of_order_count 가 0이어야 정상.
SELECT COUNT(*) AS out_of_order_count
FROM (
    SELECT
        sent_at,
        LAG(sent_at) OVER (ORDER BY message_id) AS prev_sent_at
    FROM chat_message
    WHERE room_id = @room_id
) ordered_check
WHERE prev_sent_at IS NOT NULL
  AND sent_at < prev_sent_at;

-- (2) 앞부분 20건이 실제로 하루 안에서 두 사람이 주고받는 모양인지 눈으로 확인
SELECT
    message.message_id,
    message.sent_at,
    CASE WHEN message.sender_id = @test1_id THEN @test1_nickname ELSE @test2_nickname END AS sender,
    analysis.emotion_type,
    message.content
FROM chat_message message
LEFT JOIN chat_analysis analysis ON analysis.message_id = message.message_id
WHERE message.room_id = @room_id
ORDER BY message.message_id
LIMIT 20;

-- (3) 15개 감정 라벨이 모두 등장하는지 확인 (distinct_emotion_count = 15 기대)
SELECT
    COUNT(DISTINCT analysis.emotion_type) AS distinct_emotion_count
FROM chat_analysis analysis
JOIN chat_message message ON message.message_id = analysis.message_id
WHERE message.room_id = @room_id;

SELECT
    analysis.emotion_type,
    COUNT(*) AS emotion_count
FROM chat_analysis analysis
JOIN chat_message message ON message.message_id = analysis.message_id
WHERE message.room_id = @room_id
GROUP BY analysis.emotion_type
ORDER BY emotion_count DESC;

-- (4) 정량 지표 원본 확인
SELECT
    (SELECT COUNT(*) FROM chat_message WHERE room_id = @room_id) AS total_message_count,
    (SELECT COUNT(*) FROM chat_message_image image
      JOIN chat_message message ON message.message_id = image.message_id
      WHERE message.room_id = @room_id) AS total_image_count,
    (SELECT COUNT(*) FROM chat_reaction WHERE room_id = @room_id) AS total_reaction_count,
    (SELECT COUNT(*) FROM chat_bookmark WHERE room_id = @room_id) AS total_bookmark_count,
    (SELECT COUNT(*) FROM chat_analysis analysis
      JOIN chat_message message ON message.message_id = analysis.message_id
      WHERE message.room_id = @room_id
        AND analysis.analysis_status = 'COMPLETED') AS analyzed_message_count,
    (SELECT COUNT(*) FROM mood WHERE room_id = @room_id) AS total_mood_count;

-- (5) 스냅샷이 비었는지 확인 (둘 다 0이면 정상)
SELECT
    (SELECT COUNT(*) FROM member_dashboard WHERE room_id = @room_id) AS remaining_member_snapshots,
    (SELECT COUNT(*) FROM couple_dashboard WHERE room_id = @room_id) AS remaining_couple_snapshots;
