package com.ssafy.emour.chat.crypto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChatContentCipherTest {

    private static final String KEY =
            "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

    private final ChatContentCipher cipher = new ChatContentCipher(KEY);

    @Test
    void encryptsAndDecryptsContent() {
        String encrypted = cipher.encrypt("오늘 저녁에 치킨 먹을까?");

        assertThat(encrypted).startsWith("enc:v1:");
        assertThat(encrypted).doesNotContain("치킨");
        assertThat(cipher.decrypt(encrypted))
                .isEqualTo("오늘 저녁에 치킨 먹을까?");
    }

    @Test
    void usesDifferentIvForEveryEncryption() {
        String first = cipher.encrypt("같은 메시지");
        String second = cipher.encrypt("같은 메시지");

        assertThat(first).isNotEqualTo(second);
        assertThat(cipher.decrypt(first)).isEqualTo("같은 메시지");
        assertThat(cipher.decrypt(second)).isEqualTo("같은 메시지");
    }

    @Test
    void rejectsTamperedCiphertext() {
        String encrypted = cipher.encrypt("변조하면 안 되는 메시지");
        char replacement = encrypted.endsWith("A") ? 'B' : 'A';
        String tampered = encrypted.substring(0, encrypted.length() - 1)
                + replacement;

        assertThatThrownBy(() -> cipher.decrypt(tampered))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("복호화");
    }

    @Test
    void readsLegacyPlaintextUntilMigration() {
        assertThat(cipher.decrypt("기존 평문 메시지"))
                .isEqualTo("기존 평문 메시지");
    }

    @Test
    void rejectsInvalidKeyLength() {
        assertThatThrownBy(() -> new ChatContentCipher("c2hvcnQ="))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32바이트");
    }
}
