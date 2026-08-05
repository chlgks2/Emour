package com.ssafy.emour.global.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 개발용 이메일 발송기 — 실제로 보내지 않고 서버 콘솔에 내용을 출력한다.
 *
 * app.email.mode 가 없거나 console 일 때 활성화된다(기본값).
 * 실제 발송은 app.email.mode=smtp 로 두면 {@link SmtpEmailSender} 가 대신 뜬다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.email.mode", havingValue = "console", matchIfMissing = true)
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
