package com.ssafy.emour.auth.service;

import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * 구글 ID 토큰 검증기.
 *
 * 구글 tokeninfo 엔드포인트로 ID 토큰을 검증한다(서명·만료는 구글이 확인).
 * 추가로 aud(우리 앱의 클라이언트 ID) 일치를 확인해, 우리 앱을 위해 발급된 토큰만 통과시킨다.
 * (client secret 불필요 — stateless JWT 구조에 맞는 방식)
 */
@Slf4j
@Component
public class GoogleTokenVerifier {

    private static final String TOKENINFO_URL =
            "https://oauth2.googleapis.com/tokeninfo?id_token={idToken}";

    private final RestClient restClient = RestClient.create();
    private final String clientId;

    public GoogleTokenVerifier(
            @Value("${app.oauth.google.client-id:}") String clientId
    ) {
        this.clientId = clientId;
    }

    public GoogleUserInfo verify(String idToken) {
        if (clientId == null || clientId.isBlank()) {
            log.error("app.oauth.google.client-id 가 설정되지 않았습니다.");
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }

        Map<String, Object> claims;
        try {
            claims = restClient.get()
                    .uri(TOKENINFO_URL, idToken)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });
        } catch (RestClientException e) {
            // 구글이 400 등으로 거부 = 유효하지 않은/만료된 토큰
            log.warn("구글 ID 토큰 검증 실패: {}", e.getMessage());
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        if (claims == null) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        // aud 확인: 우리 앱 클라이언트 ID 를 위해 발급된 토큰인지
        String aud = String.valueOf(claims.get("aud"));
        if (!clientId.equals(aud)) {
            log.warn("구글 토큰 aud 불일치 (expected our client id)");
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        String providerId = (String) claims.get("sub");
        String email = (String) claims.get("email");
        if (providerId == null || providerId.isBlank()
                || email == null || email.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        boolean emailVerified =
                Boolean.parseBoolean(String.valueOf(claims.get("email_verified")));
        if (!emailVerified) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }
        String name = (String) claims.get("name");
        String picture = (String) claims.get("picture");

        return new GoogleUserInfo(
                providerId,
                email,
                name,
                picture,
                true
        );
    }
}
