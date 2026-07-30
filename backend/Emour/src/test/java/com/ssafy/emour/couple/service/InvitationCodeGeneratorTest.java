package com.ssafy.emour.couple.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InvitationCodeGeneratorTest {

    private final InvitationCodeGenerator generator = new InvitationCodeGenerator();

    @Test
    void 초대_코드는_혼동_문자를_제외한_XXXX_XXXX_형식이다() {
        for (int attempt = 0; attempt < 100; attempt++) {
            String code = generator.generate();

            assertThat(code).matches("[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-"
                    + "[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}");
        }
    }
}
