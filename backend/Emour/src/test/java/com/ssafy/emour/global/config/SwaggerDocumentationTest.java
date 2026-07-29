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

    @Test
    void OpenAPI_문서에_채팅_REST_API가_표시된다() throws Exception {
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
                        "$.paths['/chats/search']"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats/{messageId}/bookmark']"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats/bookmarks']"
                ).exists())
                .andExpect(jsonPath(
                        "$.paths['/chats/images']"
                ).exists());
    }

    @Test
    void WebSocket_채팅_테스트_화면을_열_수_있다() throws Exception {
        mockMvc.perform(get("/websocket-test.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(
                        containsString("Emour WebSocket")
                ));
    }
}
