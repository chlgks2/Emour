/**
 * chat_message.client_message_id 로 쓰는 UUID.
 * 서버가 같은 값을 두 번 저장하지 않게 하는 중복 전송 방지 키라서 클라이언트가 만든다.
 */
export function createClientMessageId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
