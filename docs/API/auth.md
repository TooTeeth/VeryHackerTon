# User Registration API

## POST /api/register

사용자의 지갑 주소(`walletAddress`)를 받아서,  
기존 사용자가 있으면 조회 후 반환하고,  
없으면 새로 등록하는 API입니다.

---

### 요청(Request)

- HTTP Method: `POST`
- Content-Type: `application/json`
- Request Body 예시:

```json
{
  "walletAddress": "0x1234abcd5678ef90..."
}
```

## 응답(Response)

```json
{
  "user": {
    "id": 1,
    "wallet_address": "0x1234abcd5678ef90..."
  }
}
```

## 성공 시 (신규 사용자 생성):

```json
{
  "user": {
    "id": 2,
    "wallet_address": "0xabcdef1234567890..."
  }
}
```

## 오류 시 (필수 파라미터 누락):

```json
{
  "error": "walletAddress is required"
}
```

## 오류 시 (서버 내부 문제):

```json
{
  "error": "Internal Server Error"
}
```

```
HTTP 상태 코드
| 상태 코드 | 의미                          |
| --------- | ----------------------------- |
| 201       | 신규 사용자 생성 성공         |
| 200       | 기존 사용자 조회 성공         |
| 400       | 요청에 walletAddress가 누락됨 |
| 500       | 서버 내부 오류 발생           |
```

### 참고사항

Supabase 인증 키와 URL은 환경 변수(SUPABASE_URL, SUPABASE_KEY)로 설정되어 있어야 합니다.
