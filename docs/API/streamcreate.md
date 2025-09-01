# Create Stream API

## POST /api/stream/create

게임 스트림 정보를 받아 `"Stream"` 테이블에 새 레코드를 생성하는 API입니다.

---

### 요청(Request)

- HTTP Method: `POST`
- Content-Type: `application/json`
- Request Body 예시:

```json
{
  "Players": 4,
  "Creator": "creator_address_or_name",
  "Title": "게임 제목",
  "Era": "2020s",
  "Genre": "Action",
  "Plan": "Basic",
  "publicImageUrl": "https://example.com/image.png"
}
```

### 응답(Response)

```json
{
  "success": true,
  "Stream": [
    {
      "Title": "게임 제목",
      "Players": 4,
      "Genre": "Action",
      "Era": "2020s",
      "Plan": "Basic",
      "Creator": "creator_address_or_name",
      "Image": "https://example.com/image.png",
      "id": 1,
      "created_at": "2025-09-01T00:00:00Z"
    }
  ]
}
```

### 오류

```json
{
  "error": "Stream Create Failed"
}
```

### HTTP 상태 코드

```
| 상태 코드 | 의미          |
| ----- | ----------- |
| 201   | 스트림 생성 성공   |
| 500   | 서버 내부 오류 발생 |

```

## 참고사항

Supabase URL과 KEY는 환경변수(SUPABASE_URL, SUPABASE_KEY)로 설정되어 있어야 합니다.
