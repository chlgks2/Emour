package com.ssafy.emour.global.email;

/**
 * 이메일 발송 추상화.
 *
 * 지금은 콘솔에 출력하는 ConsoleEmailSender 를 쓰고,
 * 나중에 실제 SMTP 발송(GmailEmailSender 등)으로 이 인터페이스 구현체만 갈아끼우면 된다.
 * (나머지 코드는 EmailSender 에만 의존하므로 바꿀 필요가 없다.)
 */
public interface EmailSender {
    void send(String to, String subject, String body);
}
