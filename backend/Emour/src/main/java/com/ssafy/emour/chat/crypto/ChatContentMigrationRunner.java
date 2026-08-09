package com.ssafy.emour.chat.crypto;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ChatContentMigrationRunner implements ApplicationRunner {

    private static final int BATCH_SIZE = 500;

    private final JdbcTemplate jdbcTemplate;
    private final ChatContentCipher cipher;

    @Value("${chat.encryption.migrate-plaintext:true}")
    private boolean migratePlaintext;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!migratePlaintext) {
            return;
        }

        while (encryptNextBatch() == BATCH_SIZE) {
            // 남은 평문 메시지가 없을 때까지 작은 묶음으로 암호화합니다.
        }
    }

    private int encryptNextBatch() {
        List<PlainMessage> messages = jdbcTemplate.query(
                """
                SELECT message_id, content
                FROM chat_message
                WHERE content IS NOT NULL
                  AND content NOT LIKE 'enc:v1:%'
                ORDER BY message_id
                LIMIT ?
                """,
                (resultSet, rowNumber) -> new PlainMessage(
                        resultSet.getLong("message_id"),
                        resultSet.getString("content")
                ),
                BATCH_SIZE
        );

        if (messages.isEmpty()) {
            return 0;
        }

        jdbcTemplate.batchUpdate(
                "UPDATE chat_message SET content = ? WHERE message_id = ?",
                messages,
                messages.size(),
                (statement, message) -> {
                    statement.setString(1, cipher.encrypt(message.content()));
                    statement.setLong(2, message.messageId());
                }
        );
        return messages.size();
    }

    private record PlainMessage(Long messageId, String content) {
    }
}
