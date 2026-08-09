package com.ssafy.emour.chat.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class ChatContentCipher {

    private static final String PREFIX = "enc:v1:";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final byte[] AAD =
            "emour:chat-content:v1".getBytes(StandardCharsets.UTF_8);
    private static final int KEY_LENGTH_BYTES = 32;
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public ChatContentCipher(
            @Value("${chat.encryption.key}") String encodedKey
    ) {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(encodedKey);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "CHAT_ENCRYPTION_KEY는 Base64 형식이어야 합니다.",
                    exception
            );
        }

        if (keyBytes.length != KEY_LENGTH_BYTES) {
            throw new IllegalStateException(
                    "CHAT_ENCRYPTION_KEY는 Base64로 인코딩한 32바이트 키여야 합니다."
            );
        }
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    public String encrypt(String plaintext) {
        if (plaintext == null) {
            return null;
        }

        byte[] iv = new byte[IV_LENGTH_BYTES];
        secureRandom.nextBytes(iv);

        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(
                    Cipher.ENCRYPT_MODE,
                    secretKey,
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv)
            );
            cipher.updateAAD(AAD);
            byte[] ciphertext = cipher.doFinal(
                    plaintext.getBytes(StandardCharsets.UTF_8)
            );
            byte[] payload = ByteBuffer
                    .allocate(iv.length + ciphertext.length)
                    .put(iv)
                    .put(ciphertext)
                    .array();

            return PREFIX + Base64.getEncoder().encodeToString(payload);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("채팅 메시지를 암호화할 수 없습니다.", exception);
        }
    }

    public String decrypt(String storedValue) {
        if (storedValue == null || !isEncrypted(storedValue)) {
            // 배포 전에 저장된 평문 메시지는 마이그레이션할 때까지 읽을 수 있게 합니다.
            return storedValue;
        }

        try {
            byte[] payload = Base64.getDecoder().decode(
                    storedValue.substring(PREFIX.length())
            );
            if (payload.length <= IV_LENGTH_BYTES) {
                throw new IllegalStateException("암호화된 채팅 데이터 형식이 올바르지 않습니다.");
            }

            byte[] iv = new byte[IV_LENGTH_BYTES];
            byte[] ciphertext = new byte[payload.length - IV_LENGTH_BYTES];
            System.arraycopy(payload, 0, iv, 0, iv.length);
            System.arraycopy(payload, iv.length, ciphertext, 0, ciphertext.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(
                    Cipher.DECRYPT_MODE,
                    secretKey,
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv)
            );
            cipher.updateAAD(AAD);
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "채팅 메시지를 복호화할 수 없습니다. 암호화 키를 확인해 주세요.",
                    exception
            );
        }
    }

    public boolean isEncrypted(String value) {
        return value != null && value.startsWith(PREFIX);
    }
}
