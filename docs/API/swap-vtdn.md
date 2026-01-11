# VTDN Swap API

## PATCH /api/swap-vtdn

사용자의 지갑 주소(`walletAddress`)와 사용할 VTDN 수량(`vtdnToSpend`)을 받아  
해당 유저의 VTDN 잔액에서 차감하는 API입니다.

---

### 요청(Request)

- HTTP Method: `PATCH`
- Content-Type: `application/json`
- Request Body 예시:

```json
{
  "walletAddress": "0x1234abcd5678ef90...",
  "vtdnToSpend": 10
}
```

### 응답(Response)

```json
{
  "success": true
}
```

### 오류 시 (필수 데이터 누락)

```json
{
  "error": "Missing data"
}
```

### 오류 시 (유저를 찾지 못했을 때)

```json
{
  "error": "User not found"
}
```

### 오류 시 (VTDN 잔액을 찾지 못했을 때)

```json
{
  "error": "VTDN not found"
}
```

### 오류 시 (잔액 부족)

```json
{
  "error": "Insufficient VTDN"
}
```

### 오류 시 (서버 내부 오류)

```json
{
  "error": "error massage"
}
```

### HTTP 상태 코드

```
| 상태 코드 | 의미                 |
| ----- | ------------------ |
| 200   | VTDN 차감 성공         |
| 400   | 요청 데이터 누락 또는 잔액 부족 |
| 404   | 유저 또는 VTDN 정보 없음   |
| 500   | 서버 내부 오류           |
```

## 참고사항

walletAddress는 소문자로 변환되어 처리됩니다.

Supabase URL과 KEY는 환경변수(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)로 설정되어 있어야 합니다.
