package com.ssafy.emour.global.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * 실제 SMTP(Gmail) 이메일 발송기.
 *
 * app.email.mode=smtp 일 때만 활성화된다. (기본값 console → {@link ConsoleEmailSender})
 * 자격 증명(계정/앱 비밀번호)은 절대 하드코딩하지 않고 .env 의 환경변수로 주입한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.email.mode", havingValue = "smtp")
public class SmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;

    // 보내는 사람 주소. 없으면 spring.mail.username 을 사용한다.
    @Value("${app.email.from:${spring.mail.username:}}")
    private String from;

    @Override
    public void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (from != null && !from.isBlank()) {
            message.setFrom(from);
        }
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
        log.info("이메일 발송 완료 → {} (제목: {})", to, subject);
    }
}
