### 방법 1: Description에 작성 (간단)

Description에 스텟 정보를 텍스트로 작성합니다.

```json
{
  "name": "전설의 검",
  "description": "All stats + 10",
  "image": "ipfs://YOUR_IMAGE_CID"
}
```

**지원하는 패턴:**

- `All stats + 숫자` - 모든 스텟에 동일한 값 적용
- `STR + 숫자` - STR만 적용
- `AGI + 숫자` - AGI만 적용
- `INT + 숫자` - INT만 적용
- `HP + 숫자` - HP만 적용
- `MP + 숫자` - MP만 적용
- `LUCK + 숫자` - LUCK만 적용

**복합 예시:**

```json
{
  "description": "STR + 10, AGI + 5, HP + 50"
}
```

### 방법 2: Attributes 사용 (권장)

OpenSea 표준을 따르는 attributes 배열을 사용합니다.

```json
{
  "name": "불꽃의 검",
  "description": "화염의 힘이 깃든 전설의 검",
  "image": "ipfs://YOUR_IMAGE_CID",
  "category": "무기",
  "attributes": [
    { "trait_type": "STR", "value": 15 },
    { "trait_type": "AGI", "value": 5 },
    { "trait_type": "Category", "value": "무기" },
    { "trait_type": "Rarity", "value": "Epic" }
  ]
}
```

## 카테고리 목록

NFT를 카테고리별로 분류하려면 `category` 필드를 추가하세요:

| 카테고리 | 설명              |
| -------- | ----------------- |
| 무기     | 검, 활, 지팡이 등 |
| 신발     | 부츠, 샌들 등     |
| 장갑     | 건틀릿, 장갑 등   |
| 바지     | 레깅스, 바지 등   |
| 상의     | 갑옷, 로브 등     |
| 망토     | 망토, 케이프 등   |
| 투구     | 헬멧, 모자 등     |
| 장신구   | 반지, 목걸이 등   |
| 칭호     | 업적 칭호         |
| 스킬     | 스킬북 등         |

## 완전한 예시

### 무기 NFT

```json
{
  "name": "드래곤 슬레이어",
  "description": "용을 처치한 자에게 주어지는 검. STR + 20, LUCK + 10",
  "image": "ipfs://bafybeiabc123...",
  "category": "무기",
  "attributes": [
    { "trait_type": "STR", "value": 20 },
    { "trait_type": "LUCK", "value": 10 },
    { "trait_type": "Category", "value": "무기" },
    { "trait_type": "Rarity", "value": "Legendary" },
    { "trait_type": "Level Requirement", "value": 50 }
  ]
}
```

### 칭호 NFT

```json
{
  "name": "비그드라실을 지켜낸",
  "description": "세계수를 지킨 영웅에게 주어지는 칭호. All stats + 10",
  "image": "ipfs://bafybeiabc456...",
  "category": "칭호",
  "attributes": [
    { "trait_type": "STR", "value": 10 },
    { "trait_type": "AGI", "value": 10 },
    { "trait_type": "INT", "value": 10 },
    { "trait_type": "HP", "value": 10 },
    { "trait_type": "MP", "value": 10 },
    { "trait_type": "LUCK", "value": 10 },
    { "trait_type": "Category", "value": "칭호" },
    { "trait_type": "Rarity", "value": "Mythic" }
  ]
}
```

### 방어구 NFT

```json
{
  "name": "마법사의 로브",
  "description": "고대 마법사가 입던 로브. INT + 25, MP + 100",
  "image": "ipfs://bafybeiabc789...",
  "category": "상의",
  "attributes": [
    { "trait_type": "INT", "value": 25 },
    { "trait_type": "MP", "value": 100 },
    { "trait_type": "Category", "value": "상의" },
    { "trait_type": "Rarity", "value": "Epic" },
    { "trait_type": "Class", "value": "Magician" }
  ]
}
```

## NFT 발행 시 권장사항

1. **IPFS 사용**: 이미지와 메타데이터를 IPFS에 업로드하세요 (Pinata, NFT.Storage 등)
2. **카테고리 명시**: `category` 필드를 추가하여 인벤토리 분류를 지원하세요
3. **Description과 Attributes 모두 사용**: 호환성을 위해 둘 다 작성하세요
4. **이미지 최적화**: 적절한 크기의 이미지를 사용하세요 (500x500 ~ 1000x1000 권장)

## 기존 NFT 업데이트

이미 발행된 NFT의 메타데이터를 업데이트하려면:

1. 새 메타데이터 JSON 파일을 IPFS에 업로드
2. 컨트랙트의 `setURI` 함수를 호출하여 메타데이터 URI 업데이트
   (단, 이 기능은 컨트랙트에 구현되어 있어야 함)

## 현재 101.json 수정 예시

기존:

```json
{
  "name": "VTDN",
  "description": "All stats + 10",
  "image": "https://..."
}
```

권장 수정:

```json
{
  "name": "VTDN 전설의 뱃지",
  "description": "VTDN 커뮤니티 초기 멤버에게 주어지는 뱃지. All stats + 10",
  "image": "https://...",
  "category": "칭호",
  "attributes": [
    { "trait_type": "STR", "value": 10 },
    { "trait_type": "AGI", "value": 10 },
    { "trait_type": "INT", "value": 10 },
    { "trait_type": "HP", "value": 10 },
    { "trait_type": "MP", "value": 10 },
    { "trait_type": "LUCK", "value": 10 },
    { "trait_type": "Category", "value": "칭호" },
    { "trait_type": "Rarity", "value": "Legendary" }
  ]
}
```
