export type EthersLikeError = {
  code?: string | number;
  shortMessage?: string;
  reason?: string;
  message?: string;
};

export function isEthersError(error: unknown): error is EthersLikeError {
  if (typeof error !== "object" || error === null) return false;

  return "code" in error && (typeof (error as { code: unknown }).code === "string" || typeof (error as { code: unknown }).code === "number");
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const err = error as EthersLikeError;

    if (err.code === "ACTION_REJECTED" || err.code === 4001) {
      return "사용자가 트랜잭션을 거부했습니다";
    }

    if (err.shortMessage) return err.shortMessage;
    if (err.reason) return err.reason;
    if (err.message) return err.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "요청에 실패했습니다";
}
