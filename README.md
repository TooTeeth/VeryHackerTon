**[VTDN]**은 Web3 기술을 기반으로 한 탈중앙 텍스트+테이블탑 게임입니다.
플레이어들은 게임 내 이야기의 흐름을 따라가며, 결정적인 순간에 DAO 투표를 통해 게임의 스토리를 유지하거나 변화시킬 수 있습니다.
또한, NFT 마켓플레이스를 통해 게임 아이템, 캐릭터, 스토리 조각 등을 거래할 수 있습니다.

당신이 주인공이자 작가가 되는 세계.
이제, 모두의 선택이 게임 세계를 만듭니다.

🌐 데모 링크
🔗

## 🧩 주요 기능 (Features)

🎲 탈중앙 텍스트 기반 게임 시스템

🗳️ DAO 기반 스토리 투표 및 결정 시스템

🛒 NFT 아이템 및 캐릭터 거래 마켓플레이스

🦊 메타마스크 로그인 및 Web3 지갑 연동

🗂️ Supabase 기반 유저 데이터 및 게임 상태 관리

⚙️ Next.js App Router 구조로 구성된 SPA

📱 Wepin으로 간편한 소셜 로그인 지원(Not Smart Contract)

## 기술 스택 (Tech Stack)

```bash
- Frontend: Next.js (App Router), React, TailwindCSS
- Backend: Supabase (Database & Auth)
- Blockchain: Solidity (Smart Contracts), Ethereum, MetaMask, VERY
- Web3: ethers.js
- Infra/Tooling: IPFS (선택적), Vercel
```

## 실행 방법 (How to Run)

```bash
git clone https://github.com/TooTeeth/VeryHackerTon.git
cd yourproject
npm install
```

## 환경 변수 설정(.env.local)

아래 항목들을 `.env.local`에 추가해주세요:

````ini
NEXT_PUBLIC_WEPIN_APP_ID=your_wepin_app_id
NEXT_PUBLIC_WEPIN_APP_KEY=your_wepin_app_key

SUPABASE_KEY=your_supabase_key
SUPABASE_URL=your_supabase_url

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```


```bash
npm run dev
````

## 🧠스마트 컨트랙트

Solidity로 작성된 스마트 컨트랙트는 DAO 투표, 스토리 상태 변경, NFT 발행 및 거래 기능을 담당합니다.

```markdown
## 🧙 팀 소개 (Team)

| 이름     | 역할                      |
| -------- | ------------------------- |
| Tooteeth | 전체 개발 / 기획 / 디자인 |
```

## 📬 문의

iso7127@gmail.com

## 🌐 데모 링크

🔗 [https://your-demo-link.vercel.app](#)
