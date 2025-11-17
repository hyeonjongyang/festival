# Festival Connect

모바일 전용 학교 축제 운영 허브입니다. 학생 · 부스 관리자 · 전체 관리자가 한 곳에서 QR 방문 기록, 피드, 리더보드, 대량 계정 생성을 처리할 수 있도록 Next.js App Router 기반으로 구축합니다.

## Tech Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 + PostCSS
- TypeScript, ESLint (Next core web vitals rules)
- Prisma + SQLite(개발)/PostgreSQL(배포 예정)

## Quick Start

1. **Node.js 20+** 환경을 준비합니다.
2. 의존성을 설치합니다.

   ```bash
   npm install
   ```

3. 개발 서버를 실행합니다.

   ```bash
   npm run dev
   ```

4. 브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 모바일 뷰(360–414px) 기준으로 확인합니다.
5. 코드 변경 전 `npm run lint`와 `npm run test:all`로 기본 품질 검사를 통과하세요.

## Environment Variables

`.env.example`을 참고해 아래 값을 설정하세요.

| Key             | Description                                                       |
| --------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`  | 개발에선 `file:./prisma/dev.db` 형태의 SQLite, 배포 시 PostgreSQL |
| `SESSION_SECRET`| 16자 이상 임의 문자열. 세션 쿠키 HMAC 서명에 사용됩니다.          |

필요 시 `npx dotenv-vault`와 같은 도구로 팀 간 공유를 준비해주세요.

## Prisma & Database Layer

1. 최초 한 번 `npx prisma migrate dev --name init`으로 스키마를 동기화합니다.
2. Prisma Client는 `src/lib/prisma.ts`에서 싱글턴으로 노출되며 서버 컴포넌트/Route Handler에서 재사용합니다.
3. 데이터 모델은 `User`, `Booth`, `BoothVisit`, `VisitViolation`, `Post`, `AccountBatch`를 포함하며 `UserRole`, `AccountBatchKind` enum으로 역할을 구분합니다.
4. SQLite 파일(`prisma/dev.db`)은 로컬 개발 용도로만 사용하며 Git에서 자동으로 무시됩니다.

## Authentication Primer

- `/api/auth/code-login`으로 5자리 숫자 코드를 제출하면 세션 쿠키(`fc_session`)가 발급됩니다.
- 세션은 HMAC-SHA256으로 서명되고 12시간 동안 유효합니다. `SessionProvider`가 전역 레이아웃에서 현재 사용자를 노출합니다.
- `getSessionUser` 및 `requireRole` 헬퍼로 서버 컴포넌트/레이아웃에서 역할 기반 접근 제어를 적용합니다.

## Admin Accounts & Excel Export

- `/admin/accounts`는 전체관리자 전용 페이지로 학생 일괄 생성, 부스 관리자, 전체 관리자 발급 폼을 제공합니다.
- 학생 배치를 생성하면 학년별 시트를 포함한 Excel 파일이 `public/uploads/batches/{batchId}.xlsx`에 저장되고, `AccountBatch` 기록에서 언제든지 재다운로드할 수 있습니다.
- 모든 배치는 생성 파라미터·미리보기·결과 요약을 포함한 `payload`로 보존되며, UI 이력 섹션에서 상태를 확인할 수 있습니다.

## Excel Export Structure

학생 배치 Excel은 학년별 워크시트로 분리되며 첫 번째 행에 자동 필터가 적용됩니다. 파일은 `public/uploads/batches/{batchId}.xlsx` 경로에 보관됩니다.

| Column        | Description                                   |
| ------------- | --------------------------------------------- |
| 학년          | `grade` 열. 생성 시 지정한 학년 범위입니다.    |
| 반            | `classNumber` 열. 학년별 생성 반 수를 반영합니다. |
| 번호          | `studentNumber` 열. 시작 번호부터 1씩 증가합니다. |
| 로그인 코드   | `code` 열. 5자리 로그인 코드(중복 불가)를 제공합니다. |
| 학번          | `studentId` 열. 학년/반/번호를 조합한 5자리 학번입니다. |

Excel은 UTF-8로 저장되며, 생성 시각/생성자는 `AccountBatch` 모델 payload에서 확인할 수 있습니다.

## Feed Uploads

- 부스 관리자는 `/booth/feed/new`에서 본문과 단일 이미지를 함께 업로드할 수 있으며, 서버는 `/api/posts` Route Handler가 FormData를 검증한 뒤 `public/uploads/posts/{postId}/image.(jpg|png|webp)`에 파일을 저장합니다.
- 학생과 관람객은 `/feed`에서 무한 스크롤 피드를 확인합니다. 데이터는 `fetchFeedPage`(Prisma + 페이지네이션)으로 공급되고, 방문 스캐너와 관리용 삭제 버튼만 노출됩니다.
- 이미지 정리는 하루 단위 CRON(Job) TODO로 남겨 두었으며, README와 UI에 동일한 정책을 명시해 운영자가 주기적으로 `public/uploads/posts`를 확인할 수 있도록 했습니다.

## Visit Workflow

1. 부스 관리자는 `/booth/visits` 페이지에서 고정된 부스 QR 코드와 토큰을 확인·출력하고, 실시간 방문 현황을 모니터링합니다.
2. 학생은 `/feed` 화면의 방문 스캔 버튼을 눌러 부스 QR을 촬영하면 `/api/visits/record`가 동일 부스 중복 방문 여부를 검사해, 각 부스를 한 번만 기록하도록 보장합니다.
3. 기록이 성공하면 학생 마이페이지와 관리자/부스 대시보드가 즉시 갱신되고, 제한을 위반한 시도는 `VisitViolation` 히스토리로 남아 운영 경고 패널에서 확인할 수 있습니다.
4. 현장에서 스캔이 어려운 경우, 부스가 노출하는 토큰 문자열을 이용해 학생이 직접 스캔하도록 안내하거나 별도 보조 입력 방안을 마련할 수 있습니다.

## Leaderboard & Filters

- `/leaderboard` 페이지는 Prisma `fetchBoothLeaderboard` 결과를 기반으로 부스 방문 순위를 보여주며, 15초 간격으로 자동 새로고침합니다.
- `/api/leaderboard/booths`는 최신 부스 방문 순위를 JSON 형태로 반환하고, 클라이언트는 `mutate` 버튼/자동 갱신으로 방문 기록 직후 상태를 다시 불러옵니다.
- 빈 상태, 오류 배너, 총 학생 수 집계가 포함된 모바일 카드 UI로 현장 운영진이 순위를 즉시 공유할 수 있습니다.

### Available Scripts

| Command         | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `npm run dev`            | Next.js 개발 서버 (hot reload 포함)                                |
| `npm run build`          | 프로덕션 빌드 생성                                                  |
| `npm run start`          | 빌드 산출물 실행                                                    |
| `npm run lint`           | ESLint 검사                                                         |
| `npm run test`           | Vitest 기본 모드(Watcher)                                           |
| `npm run test:unit`      | Vitest를 `run` 모드로 실행해 학번/코드 생성기 등 순수 유틸/도메인 로직을 검증 |
| `npm run test:integration` | Next API Route 통합 테스트 실행                                      |
| `npm run test:prisma`    | Prisma DMMF 기반 스키마 무결성 검사                                 |
| `npm run test:all`       | 위 세 가지 테스트를 순차 실행                                        |
| `npm run audit:lighthouse` | 실행 중인 서버를 대상으로 모바일 기본 설정 Lighthouse 리포트를 생성    |
| `npm run prepare:deploy` | lint → test:all → build 순으로 배포 전 점검                          |
| `npm run deploy:vercel`  | `prepare:deploy` 이후 `npx vercel deploy --prebuilt` 자동 실행        |

## Project Structure

```
festival-app/
├─ src/
│  └─ app/          # App Router 엔트리, 모바일 우선 UI
├─ public/
│  └─ uploads/
│     ├─ batches/   # Excel 배치 파일 (batches/{id}.xlsx)
│     └─ posts/     # 피드 이미지 (posts/{postId}/image.ext)
├─ postcss.config.mjs
├─ tsconfig.json
└─ eslint.config.mjs
```

### Development Notes

- `@/*` alias가 `src/*`를 가리키도록 `tsconfig.json`에 설정되어 있습니다. 서버/클라이언트 코드 모두 동일한 경로로 import 합니다.
- Tailwind CSS v4는 `globals.css` 내에서 `@import "tailwindcss";`와 `@theme inline`으로 동작합니다. 전역 토큰(`--background`, `--accent`, `glass-panel` 유틸)도 여기에서 정의합니다.
- `npm run test:unit`은 닉네임/코드 팩토리, 방문 로직 등 도메인 유닛 테스트를 실행하고, `npm run test:integration`은 대표 API Route 핸들러, `npm run test:prisma`는 Prisma 스키마 제약 조건을 검증합니다.

## Accessibility & Lighthouse

- `src/app/layout.tsx`에 Skip Navigation 링크를 추가하고, 피드·리더보드·학생 마이페이지 UI의 버튼/배너를 `aria-*` 속성으로 보강했습니다.
- 접근성 점검 결과와 수동 체크리스트는 `docs/a11y-checklist.md`에 정리되어 있으며, Lighthouse 모바일 리포트는 `docs/lighthouse/mobile-report.html`에 저장됩니다.
- 실행 중인 서버가 있다면 `npm run audit:lighthouse`로 Lighthouse 기본 모바일 설정 리포트를 생성할 수 있습니다.

## Deployment

1. `npm run prepare:deploy`로 lint → tests → build를 연속 실행해 산출물을 검증합니다.
2. Vercel CLI를 사용할 경우 `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` 환경 변수를 설정한 뒤 `npm run deploy:vercel`을 실행하면 사전 빌드된 산출물을 즉시 배포합니다.
3. 다른 호스팅 환경이라면 `npm run build` 후 `.next` 디렉터리를 서버에 업로드하고 `npm run start`로 실행하세요.

> 개발 환경에서는 `.env.local`에 `DATABASE_URL`, `SESSION_SECRET`을 유지하고, 배포 환경에서는 같은 값을 플랫폼의 Secret/Env 관리 기능으로 주입합니다.
