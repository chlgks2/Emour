package com.ssafy.emour.global.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 개발용 이메일 발송기 — 실제로 보내지 않고 서버 콘솔에 내용을 출력한다.
 *
 * 실제 발송이 필요해지면 이 클래스를 실제 SMTP 구현으로 교체(또는 @Profile 로 분리)한다.
 */
@Slf4j
@Component
public class ConsoleEmailSender implements EmailSender {

    @Override
    public void send(String to, String subject, String body) {
        log.info("""

                ========== [개발용 이메일 발송] ==========
                받는사람 : {}
                제목     : {}
                내용     : {}
                =========================================
                """, to, subject, body);
    }
}
