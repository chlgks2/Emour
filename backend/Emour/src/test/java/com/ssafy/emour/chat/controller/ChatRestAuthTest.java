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

    @BeforeEach
    void setUpMember() {
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
}
