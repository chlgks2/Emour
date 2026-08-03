import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./TextField.module.css";

/**
 * @param {string} type - text, email, password 등
 * @param {string} error - 에러 메시지 (있으면 빨간 테두리 + 문구 표시)
 * @param {string} success - 성공 메시지 (있으면 초록 문구 표시)
 * @param {ReactNode} rightSlot - 입력창 우측에 넣을 버튼/아이콘 (예: 중복확인 버튼)
 */
export default function TextField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  success,
  hint,
  rightSlot,
  disabled = false,
  name,
  autoComplete,
  inputMode,
  maxLength,
  required = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();
  const messageId = useId();

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;
  const message = error || success || hint;

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={[styles.inputRow, error ? styles.inputRowError : ""].join(" ")}>
        <input
          id={inputId}
          className={styles.input}
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {rightSlot && <div className={styles.rightSlot}>{rightSlot}</div>}
      </div>
      {/* role="alert" 로 에러가 생기면 스크린 리더가 즉시 읽어준다 */}
      {error && (
        <p id={messageId} className={styles.errorText} role="alert">
          {error}
        </p>
      )}
      {!error && success && (
        <p id={messageId} className={styles.successText}>
          {success}
        </p>
      )}
      {!error && !success && hint && (
        <p id={messageId} className={styles.hintText}>
          {hint}
        </p>
      )}
    </div>
  );
}
