package com.ssafy.emour.chat.crypto;

import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.MessageType;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "chat.encryption.key=AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8="
})
@Import({ChatContentCipher.class, ChatContentAttributeConverter.class})
class ChatContentJpaTest {

    @Autowired
    private ChatMessageRepository repository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void storesCiphertextAndLoadsPlaintext() {
        ChatMessage saved = repository.save(ChatMessage.create(
                1L,
                10L,
                "7cc9768e-344a-4a96-b1b6-dfa93668ac6c",
                MessageType.TEXT,
                "둘만 볼 수 있는 메시지"
        ));
        entityManager.flush();

        String storedContent = jdbcTemplate.queryForObject(
                "SELECT content FROM chat_message WHERE message_id = ?",
                String.class,
                saved.getMessageId()
        );
        assertThat(storedContent).startsWith("enc:v1:");
        assertThat(storedContent).doesNotContain("둘만");

        entityManager.clear();
        ChatMessage loaded = repository.findById(saved.getMessageId())
                .orElseThrow();
        assertThat(loaded.getContent()).isEqualTo("둘만 볼 수 있는 메시지");
    }
}
