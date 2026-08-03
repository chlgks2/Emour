import { Component } from "react";
import { HeartCrack } from "lucide-react";
import styles from "./ErrorBoundary.module.css";

/**
 * 렌더링 중 예외가 나면 흰 화면이 되는 걸 막는 최상위 방어막.
 * (React 는 에러 바운더리를 클래스 컴포넌트로만 지원한다)
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // TODO: 백엔드/모니터링 연동 시 여기서 에러 리포팅 (Sentry 등)
    console.error("[Emour] 화면 렌더링 오류:", error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className={styles.wrap} role="alert">
        <HeartCrack className={styles.icon} size={40} aria-hidden="true" />
        <h1 className={styles.title}>화면을 표시하지 못했어요</h1>
        <p className={styles.description}>
          일시적인 문제일 수 있어요. 새로고침해도 계속된다면 잠시 후 다시 시도해주세요.
        </p>
        <button type="button" className={styles.reloadBtn} onClick={this.handleReload}>
          새로고침
        </button>
        {import.meta.env.DEV && (
          <pre className={styles.devDetail}>{String(error?.stack || error?.message || error)}</pre>
        )}
      </div>
    );
  }
}
