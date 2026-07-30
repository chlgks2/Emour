package com.ssafy.emour.couple.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class InvitationCodeGenerator {

    private static final char[] CHARACTERS =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int CODE_LENGTH = 8;

    private final SecureRandom secureRandom = new SecureRandom();

    public String generate() {
        StringBuilder code = new StringBuilder(CODE_LENGTH + 1);
        for (int index = 0; index < CODE_LENGTH; index++) {
            if (index == CODE_LENGTH / 2) {
                code.append('-');
            }
            code.append(CHARACTERS[secureRandom.nextInt(CHARACTERS.length)]);
        }
        return code.toString();
    }
}
