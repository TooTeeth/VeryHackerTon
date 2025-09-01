# Wepin Google Provider Login API

## POST /api/login

`provider`가 `"google"`인 경우에만 지원되는 로그인 API입니다.  
Wepin API를 호출하여 OAuth 콜백을 처리하고 토큰을 반환합니다.

---

### 요청(Request)

- HTTP Method: `POST`
- Content-Type: `application/json`
- Request Body 예시:

```json
{
  "provider": "google"
}
```

### 응답(Response) 성공 시 (200 OK)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 실패 시 (지원하지 않는 로그인 방법)

```json
{
  "success": false,
  "message": "This login method is not supported."
}
```

### 실패 시 (Wepin API 호출 실패 또는 로그인 실패)

```json
{
  "success": false,
  "message": "Login failed."
}
```

### 실패 시 (서버 오류)

```json
{
  "success": false,
  "message": "server error"
}
```

### HTTP 상태 코드

```
| 상태 코드 | 의미                       |
| ----- | ------------------------ |
| 200   | 로그인 성공                   |
| 400   | 지원하지 않는 로그인 방법 또는 로그인 실패 |
| 405   | 지원하지 않는 HTTP 메서드         |
| 500   | 서버 내부 오류                 |
```

## 참고사항

현재는 provider가 "google"인 경우만 지원합니다.

Wepin OAuth 콜백 URL은 코드 내 하드코딩 되어 있습니다.
