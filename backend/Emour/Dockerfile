# ===== 1단계: 빌드 =====
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
RUN chmod +x ./gradlew
RUN ./gradlew dependencies --no-daemon || true   # 의존성 캐싱
COPY src src
RUN ./gradlew clean bootJar --no-daemon -x test

# ===== 2단계: 실행 (JRE만) =====
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=builder /app/build/libs/*.jar app.jar
RUN mkdir -p /app/uploads
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70.0 -Duser.timezone=Asia/Seoul -Dfile.encoding=UTF-8"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]