package com.ssafy.emour.global.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SwaggerDocumentationTest {

    @Autowired
    private MockMvc mockMvc;

    // Swagger 문서에 채팅 REST API가 표시되는지 확인합니다.
    @Test
    void exposesChatApis() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title")
                        .value("Emour Backend API"))
                .andExpect(jsonPath(
                        "$.paths['/chats'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats'].post"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats/{messageId}/read']"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats/read-status'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats/search']"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats/{messageId}/bookmark']"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats/bookmarks']"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats/{messageId}/reaction'].post"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats/{messageId}/reaction'].delete"
                ).exists());
    }

    // 개인·커플 대시보드 API가 Swagger 문서에 표시되는지 확인합니다.
    @Test
    void exposesDashboardApi() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/couple/counts'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/me/counts'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/couple/emotion-flow'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/couple/frequent-words'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/couple/main-emotions'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/couple/conversation-flow'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/daily']"
                ).doesNotExist())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/counts']"
                ).doesNotExist())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/emotion-flow']"
                ).doesNotExist())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/frequent-words']"
                ).doesNotExist())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/main-emotions']"
                ).doesNotExist())
                .andExpect(jsonPath(
                        "$.paths['/dashboards/conversation-flow']"
                ).doesNotExist());
    }

    @Test
    void exposesProfileImagesApi() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(
                        "$.paths['/users/profile-img'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/users/profile-img'].post"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/users/me/profile-img'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/users/partner/profile-img'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/users/partner-nickname'].get"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/users/partner-nickname'].patch"
                ).exists());
    }

    @Test
    void exposesMoodApisWithBearerAuth() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/moods'].post").exists())
                .andExpect(jsonPath("$.paths['/moods'].get").exists())
                .andExpect(jsonPath(
                        "$.paths['/moods/{moodId}'].patch"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/moods'].post.security[0].bearerAuth"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/moods'].get.security[0].bearerAuth"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/moods/{moodId}'].patch.security[0].bearerAuth"
                ).exists());
    }

    // 로그인 화면에서 이메일과 비밀번호를 입력할 수 있는지 확인합니다.
    @Test
    void exposesLoginInputSchema() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(
                        "$.paths['/auth/login'].post.summary"
                ).value("이메일 로그인"))
                .andExpect(jsonPath(
                        "$.paths['/auth/login'].post.parameters[0].name"
                ).value("email"))
                .andExpect(jsonPath(
                        "$.paths['/auth/login'].post.parameters[0].in"
                ).value("query"))
                .andExpect(jsonPath(
                        "$.paths['/auth/login'].post.parameters[1].name"
                ).value("password"))
                .andExpect(jsonPath(
                        "$.paths['/auth/login'].post.parameters[1].in"
                ).value("query"));
    }

    // WebSocket 채팅 테스트 화면이 정상적으로 열리는지 확인합니다.
    @Test
    void opensWebSocketTestPage() throws Exception {
        mockMvc.perform(get("/websocket-test.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(
                        containsString("Emour WebSocket")
                ));
    }

    // 배포 서버가 로그인 없이 백엔드 실행 상태를 확인할 수 있습니다.
    @Test
    void opensHealthEndpoint() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
