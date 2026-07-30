package com.ssafy.emour.chat.controller;

import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.global.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ChatRestAuthTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private CoupleMemberRepository coupleMemberRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUpMember() {
        // couple_member를 넣기 전에 외래키의 부모인 회원과 방을 만듭니다.
        jdbcTemplate.update(
                """
                INSERT IGNORE INTO app_user
                    (user_id, email, nickname, status, is_email_verified)
                VALUES (10, 'chat-auth-test@ssafy.com', '인증테스터', 'ACTIVE', TRUE)
                """
        );
        jdbcTemplate.update(
                """
                INSERT IGNORE INTO couple_room (room_id, room_code, status)
                VALUES (1, 'CHAT_AUTH_TEST_ROOM', 'ACTIVE')
                """
        );
        coupleMemberRepository.save(CoupleMember.active(10L, 1L));
    }

    // Access Token이 없으면 채팅 API를 사용할 수 없습니다.
    @Test
    void rejectsMissingToken() throws Exception {
        mockMvc.perform(get("/chats")
                        .param("roomId", "1"))
                .andExpect(status().isUnauthorized());
    }

    // 메시지를 보낸 회원 번호는 요청값이 아니라 Access Token에서 가져옵니다.
    @Test
    void usesTokenUser() throws Exception {
        String accessToken = jwtTokenProvider.createAccessToken(10L);

        mockMvc.perform(post("/chats")
                        .header(
                                "Authorization",
                                "Bearer " + accessToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roomId": 1,
                                  "clientMessageId": "406beb6a-f16b-4c79-a37c-dd64648de1a2",
                                  "messageType": "TEXT",
                                  "content": "안녕!",
                                  "imageUrls": []
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.senderId").value(10L));
    }

    // 유효한 토큰이어도 방 멤버가 아니면 서버 오류가 아닌 요청 오류를 반환합니다.
    @Test
    void rejectsNonMember() throws Exception {
        String accessToken = jwtTokenProvider.createAccessToken(99L);

        mockMvc.perform(post("/chats")
                        .header(
                                "Authorization",
                                "Bearer " + accessToken
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roomId": 1,
                                  "clientMessageId": "c38d9368-8083-469e-b631-16f91db4b532",
                                  "messageType": "TEXT",
                                  "content": "안녕!",
                                  "imageUrls": []
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message")
                        .value("해당 채팅방에 참여 중인 사용자가 아닙니다."));
    }
}
