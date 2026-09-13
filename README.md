# shortsmachine · 쇼츠머신

PC·Mac 브라우저에서 관리자 한 명이 쓰는 쇼츠 제작 MVP입니다.

## 사용 순서
한국어·영어 소재 탐색 또는 직접 입력 → 출처와 사실 저장 → AI 카드 문구·영상 대본 → 3~12장 편집 → Wikimedia 이미지 검색·선택 또는 직접 업로드 → 카드 미리보기 → 저장 → 전체 PNG 또는 카드별 PNG ZIP 다운로드.

영상 제작, TTS, 자료 영상 확보, 예약 업로드는 제외합니다.

## 구조
| 계층 | 구성 |
|---|---|
| 화면 | React 19 + TypeScript + Vinext (Next App Router 호환) |
| API | Cloudflare Workers |
| 데이터 | D1 SQLite: 출처·대본·장면·버전·생성 잠금 |
| 이미지 | 비공개 R2 + 인증된 다운로드 API |
| 인증 | Sites 소유자 전용 접근 + ChatGPT 로그인 |
| AI | OpenAI Responses 웹 검색·구조화 대본 (이미지 생성 호출 없음) |
| 코드 | GitHub wlrnr/shortsmachine |
| 배포 | Sites가 Workers·D1·R2와 개인 URL 관리 |

GitHub 코드 공개 범위와 앱 접근 범위는 별개입니다. 앱은 소유자 전용으로 유지합니다. 모든 API는 로그인과 레코드 소유권을 확인합니다. Sites 밖에 직접 배포하려면 신뢰 가능한 인증 계층으로 교체해야 합니다.

## 로컬 실행
Node.js 22.13 이상과 npm이 필요합니다.

```sh
npm ci
cp .env.example .env.local
# Windows에서는 파일을 복사합니다. .env.local에 API 키를 직접 입력합니다.
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_robust_krista_starr.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_fixed_morph.sql
npm run dev
```

로컬에서는 `/signin-with-chatgpt?return_to=/`로 테스트 계정에 로그인합니다. 로컬 인증은 배포 빌드에 포함되지 않습니다. 마이그레이션은 새 DB에 한 번만 적용하며 변경 시 `npm run db:generate`로 새 파일을 생성합니다.

## 환경·배포
`.env.local`은 Git에서 제외됩니다. `OPENAI_API_KEY`는 서버 전용입니다. `TEXT_MODEL` 기본값은 `gpt-4.1-mini`, `RESEARCH_MODEL` 기본값은 `gpt-5.4-mini`이며 환경 변수로 변경할 수 있습니다.

호스팅 환경에는 Sites 환경 설정으로 `OPENAI_API_KEY`를 secret으로 별도 등록해야 합니다. 로컬 파일은 업로드하지 않습니다. `.openai/hosting.json`에는 논리 DB/R2 바인딩만 저장합니다.

배포 순서: 빌드 → 정확한 소스 커밋·푸시 → 빌드 출력 패키징 → Sites 버전 저장 → 소유자 전용 배포. GitHub Actions는 코드 검사·빌드를 수행하며 Sites 게시 자체는 별도입니다.

## 저장과 비용 제어
- revision 일치 조건으로 다른 기기의 변경 덮어쓰기를 차단합니다.
- 레코드 생성 잠금은 중복 클릭을 막고 5분이 지나면 복구할 수 있습니다.
- 대본 변경 시 이전 스토리보드를 무효화합니다.
- 한국어·영어 검색 후 최대 5개 소재를 선별합니다. 카드 이미지는 브라우저에서 조합하므로 이미지 생성 API를 호출하지 않습니다.
- 실패 요청은 자동 재시도하지 않습니다. 제공자가 처리한 뒤 연결이 끊기면 사용량 대시보드에서 과금을 확인하세요.
- 실제 비용은 모델 토큰·검색 횟수와 호스팅 요금에 따라 달라집니다. API 계정의 사용량 알림을 설정하세요. 앱 자체의 금액 하드캡은 없습니다.

## 검증
```sh
npx tsc --noEmit
npm run build
node tests/workflow.mjs
node tests/cards.mjs --search
```
workflow 검증은 로컬 서버에서 인증, 출처 검증, 저장, 편집, 동시 수정 충돌, 다운로드 상태를 확인합니다. AI 과금은 발생하지 않으며 `[검증용]` 레코드가 로컬에 남습니다.

실제 AI 사용에는 유효한 API 키·잔액·모델 권한이 필요합니다. 원문 사실관계, 이미지의 관련성 및 사용 조건은 사람이 검토해야 합니다. 검색 이미지의 원본 주소·저작자·사용 조건을 보존합니다. 업로드는 JPG/PNG/WebP 8MB 이하만 허용하며 프로젝트별 비공개 R2에 저장합니다. 카드 출력은 4:5 또는 1:1이며 출처·내레이션 파일을 ZIP에 포함합니다. 카드 크기는 다운로드 옵션이고 저장되는 콘텐츠는 기기 간 공유됩니다.

## 공식 API 참고
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://www.mediawiki.org/wiki/API:Imageinfo
