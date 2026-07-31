import { Send, Smile } from "lucide-react";
import styles from "./ChatInputBar.module.css";

export default function ChatInputBar({ value, onChange, onSend, disabled }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={styles.bar}>
      {/* 이모지 피커는 아직 미구현. 눌러도 아무 일이 없으면 고장처럼 보이므로
          명시적으로 비활성화해 둔다. (구현 시 disabled 제거 + onClick 연결) */}
      <button
        type="button"
        className={styles.emojiBtn}
        aria-label="이모지 (준비 중)"
        title="준비 중이에요"
        disabled
      >
        <Smile size={20} />
      </button>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요"
        aria-label="메시지 입력"
        enterKeyHint="send"
      />
      <button
        type="button"
        className={styles.sendBtn}
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="전송"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
