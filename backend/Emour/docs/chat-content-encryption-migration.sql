-- 기존 MySQL DB에 채팅 저장 암호화를 적용하기 전에 한 번 실행합니다.
-- 암호문은 평문보다 길기 때문에 content 컬럼을 TEXT로 넓힙니다.
ALTER TABLE `chat_message`
    MODIFY COLUMN `content` TEXT NULL;

-- 이후 CHAT_ENCRYPTION_KEY를 설정하고 백엔드를 실행하면
-- ChatContentMigrationRunner가 기존 평문을 AES-256-GCM 암호문으로 변경합니다.
