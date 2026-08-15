# 로컬 우선 여행 계획 엔진 구현 명세

**문서 상태:** Implementation-ready  
**기준일:** 2026-08-15  
**적용 대상:** `D:\codings\pet-travel-planner`  
**참고 소스:** `C:\Users\hh\Downloads\이것이멀티에이전트다_source\TravelPlanner`  
**결정 우선순위:** 이 문서는 여행 계획 V2 구현 범위에서 기존 `PRD.md`와 `ARCHITECTURE.md`를 구체화한다. 검색 적합성 원칙은 유지하며, 사용자가 명시적으로 고른 보조 항목을 계획에 넣는 규칙은 이 문서가 우선한다.

---

## 1. 한 문장 결론

참고 Python 소스를 복사하거나 별도 서버로 붙이지 않고, 현재 Next.js/TypeScript 애플리케이션 안에 **검증 가능한 로컬 계획 오케스트레이터**를 만든다. OpenAI API가 없어도 장소 선택, 코스 순서, 일정 계산, 부분 실패 경고, 저장, 수정, 인쇄까지 동작해야 한다.

여기서 “에이전트”는 LLM이나 별도 프로세스가 아니다. 하나의 계획을 만드는 책임을 나눈 순수 TypeScript 단계(stage)다. 외부 API와 AI는 교체 가능한 provider로만 연결한다.

---

## 2. 이번 결정에서 잠그는 내용

1. Python, MCP 서버, 별도 마이크로서비스를 추가하지 않는다.
2. `OPENAI_API_KEY`는 V2 계획 생성의 필수 조건이 아니다.
3. 현재 카탈로그와 사용자가 선택한 항목만 계획 입력으로 사용한다.
4. LLM은 장소, 주소, 입장 조건, 거리, 시간, 가격을 생성하거나 수정할 권한이 없다.
5. 도로 API가 없거나 실패하면 직선거리는 표시하되 이동시간과 그 뒤 도착시각은 `unknown`으로 둔다.
6. 검색 결과의 적합성과 축제·산책로·주변 시설의 확인 상태를 `exact: boolean` 하나로 표현하지 않는다.
7. 사용자가 명시적으로 선택하고 추가 선택 검토를 완료한 보조 항목은 코스에 포함할 수 있다. 단, 반려동물 동반 확인 상태를 그대로 표시한다.
8. 모든 비동기 단계는 입력 revision을 가지며, 오래된 응답은 최신 계획을 덮어쓸 수 없다.
9. 생성 결과는 한 번에 commit한다. 단계가 실패했다고 반쯤 계산된 객체를 현재 유효 계획 위에 덮지 않는다.
10. 계획서와 인쇄물에는 사용자가 최종 `includedItemIds`로 확정한 항목과 그 항목에서 파생된 이동 정보만 들어간다.

---

## 3. “API 없이 로컬로 된다”의 정확한 의미

API는 세 종류를 구분해야 한다.

| 기능 | 키가 하나도 없을 때 | 해당 키가 있을 때 |
|---|---|---|
| 장소 선택 | fixture 또는 이미 동기화된 SQLite로 가능 | 최신 관광 데이터 동기화 가능 |
| 코스 순서 | 좌표와 Haversine 거리로 가능 | 동일 |
| 계획 일정 | 체류시간과 순서는 계산 가능 | 도로 이동시간까지 계산 가능 |
| 도로 거리·교통 | 직선거리, 이동시간 미상 | `KAKAO_REST_API_KEY`로 도로 거리·시간·혼잡도 사용 |
| 산책로 | 로컬 SQLite 데이터가 있으면 가능 | 동기화 시 최신화 가능 |
| 축제 | 캐시된/선택 당시 snapshot만 사용 | Tourism API로 새 목록 조회 가능 |
| 주변 병원·펫숍·식당 | 이미 선택한 snapshot은 계획 가능 | Kakao Local 검색으로 새 후보 조회 가능 |
| 자연어 계획 수정 | 버튼과 폼 command로 전부 가능 | OpenAI adapter를 켜면 자연어를 같은 command로 변환 가능 |
| 보고서/PDF | 템플릿 기반으로 가능 | AI 없이도 동일하게 가능 |

따라서 V2의 “로컬 우선”은 **AI API가 없어도 완성된 계획 워크플로가 동작한다**는 뜻이다. 인터넷과 모든 provider까지 끊긴 경우에는 사실을 만들어내지 않고 기능별로 정직하게 축소된다.

Kakao 경로 API가 없는 로컬-only 결과는 정상적인 `partial` plan이다. 방문 순서와 체류시간은 보이지만 이동시간과 그 뒤 절대시각은 미상으로 표시된다. “몇 분 걸리고 몇 시 도착”까지 채운 `ready` 시간표에는 도로 provider가 필요하며, V1은 사용자 입력 이동시간이나 평균속도 추정값을 받지 않는다.

---

## 4. 목표와 비목표

### 4.1 목표

- 사용자가 고른 장소, 축제, 산책로, 주변 시설을 한 계획 컨텍스트에서 관리한다.
- 출발 순서, 장소별 체류시간, 이동시간, 도착·출발시각, 혼잡 정보가 한눈에 보이는 일정표를 만든다.
- 도로 API의 전체 실패와 일부 구간 실패를 구분하고, 가능한 부분은 계속 보여준다.
- 계획 조건을 바꾸면 필요한 단계만 다시 계산한다.
- 새로고침 후에도 선택 항목과 계획 조건을 복원한다. 실시간 경로·혼잡은 저장하지 않고 다시 계산한다.
- 화면과 A4 인쇄물이 같은 구조화된 report model을 사용한다.
- 향후 OpenAI API를 붙여도 기존 검증과 사실 데이터 경계를 바꾸지 않는다.

### 4.2 비목표

- AI가 새로운 여행지를 추천하거나 현재 카탈로그 밖 장소를 생성하는 것
- 실시간 예약, 결제, 입장 가능 여부 보장
- 경로 API 없이 임의 평균속도로 이동시간을 만들어내는 것
- 다인 협업, 계정 간 계획 공유, 서버 영구 저장
- Python 참고 소스의 프롬프트와 모델 출력을 그대로 이식하는 것
- 첫 구현에서 숙박 예약, 항공·기차 비교까지 확장하는 것

---

## 5. 현재 구현과 해결할 문제

| 현재 상태 | 코드 위치 | V2에서 해결할 내용 |
|---|---|---|
| 계획 선택 상태가 `SearchExperience`에 흩어져 있음 | `src/features/search/SearchExperience.tsx` | versioned `PlanningSession`으로 통합 |
| 날짜·출발·체류·경로가 `PlanBuilder` 내부 state | `src/features/planner/PlanBuilder.tsx` | session request와 draft로 이동 |
| `planPlaces[0]`가 주변 기준점, 코스 출발점, 첫 이동 출발점을 동시에 의미 | `SearchExperience.tsx`, `CourseBuilder.tsx` | `nearbyAnchorId`, `startItemId`, `orderedItemIds` 분리 |
| 모든 장소의 체류시간이 동일 | `PlanBuilder.tsx` | 기본 체류시간 + 장소별 override |
| 첫 장소 체류와 마지막 장소 체류가 일정에 정확히 표현되지 않음 | `src/domain/travel-schedule.ts` | 방문 시작·종료와 구간 이동을 별도 계산 |
| 한 구간 시간이 없으면 이후 시간이 모두 null이 되지만 이유 구조가 없음 | `travel-schedule.ts` | null cascade를 유지하되 issue와 영향 범위를 명시 |
| 좌표 있는 축제는 `exact:true` 장소로 바뀜 | `SearchExperience.tsx` | source와 pet verification을 별도 필드로 보존 |
| 좌표 없는 축제·산책로는 일정 밖 단순 목록 | `PlanBuilder.tsx` | `unscheduledItems`로 보존하고 이유 표시 |
| 주변 서비스는 `exact:false`지만 코스에 들어갈 수 있음 | `NearbyServices.tsx`, `course.ts` | 명시 선택/검토와 정책 검증 상태를 분리 |
| 경로 API 응답 타입이 컴포넌트 안에 중복 선언 | `PlanBuilder.tsx` | 공유 Zod 계약과 directions client로 이동 |
| 경로의 택시비·통행료가 변환 중 버려짐 | `PlanBuilder.tsx` | `RouteCost`와 provenance로 보존 |
| 생성 중 선택이 바뀌면 오래된 요청이 state를 덮을 수 있음 | `PlanBuilder.tsx` | AbortSignal + input revision + fingerprint guard |
| 인쇄가 `window.print()`용 DOM에 강결합 | `PlanBuilder.tsx`, `globals.css` | `PlanReportViewModel`을 화면/인쇄가 함께 사용 |
| 새로고침하면 계획 전체가 사라짐 | 현재 persistence 없음 | Zod 검증 localStorage repository 추가 |

`PlanItinerary`와 `TravelPlan`은 현재 실행 흐름에서 사실상 사용되지 않는다. V2 기반 타입으로 재사용하지 않고, 기존 `PlanPlace`, `PlanActivity`, `RouteSegment`는 migration 기간의 UI DTO로만 유지한다.

---

## 6. 반드시 지켜야 할 제품 불변식

### 6.1 선택과 사실

- 산출물의 모든 항목 ID는 입력 snapshot에 존재해야 한다.
- 엔진이 자동으로 장소를 추가하지 않는다.
- 사용자가 코스에서 제외한 항목은 report에 방문지로 나타나지 않는다.
- 검색 hard 조건은 계획 단계에서 완화하지 않는다.
- `exact` 결과의 근거는 계획 snapshot에 복사해 둔다.
- 보조 항목을 코스에 넣는다고 pet admission이 `confirmed`로 승격되지 않는다.

### 6.2 보조 항목 정책

항목은 역할과 확인 상태를 별도로 가진다.

| 예 | role | pet admission | 코스 포함 규칙 |
|---|---|---|---|
| hard 조건 exact 검색 장소 | `core` | `confirmed` | 명시 저장 후 가능 |
| 조건 없이 둘러보다 저장한 장소 | `core` | `not-evaluated` | 명시 저장 후 가능, 확인 안내 |
| 좌표 있는 축제 | `supplemental` | `unverified` | 지역 추가 선택 검토 후 가능 |
| 좌표 없는 산책로 | `supplemental` | `unverified` | 경로에는 불가, 계획 메모에 유지 |
| 동물병원·펫숍 | `supplemental` | `not-applicable` | 주변 추가 선택 검토 후 가능 |
| 검색어로 찾은 동반 식당·카페 | `supplemental` | `unverified` | 주변 추가 선택 검토 후 가능, 전화 확인 표시 |

기존 문서의 “exact-qualified 장소만 course가 소비한다”는 원칙은 자동 추천 후보에 계속 적용한다. 다만 사용자가 별도 패널에서 직접 고르고 검토를 완료한 supplemental item은 `exact` 장소라고 주장하지 않는 조건으로 route node가 될 수 있다.

여기서 “추가 선택 검토 완료”는 후보 목록을 확인하고 포함 여부를 결정했다는 뜻일 뿐, 업소에 전화해 반려동물 입장을 확인했다는 뜻이 아니다. review event는 `petAdmission.status`를 변경하지 않는다. 실제 사용자 확인 기능을 나중에 넣는 경우에만 별도 `CONFIRM_PET_ADMISSION` command와 `user-confirmation` evidence를 사용한다.

### 6.3 수치와 불확실성

- 도로 provider가 준 거리·시간·비용만 `provider-road` 값으로 표시한다.
- Haversine 거리는 `coordinate-only`로 표시하며 `durationMinutes`는 반드시 `null`이다.
- 이동시간이 없는 구간 뒤의 절대 도착·출발시각은 모두 `null`이다.
- `0원`과 `가격 미상`은 다른 값이다.
- 축제 기간, 운영시간, 산책 소요시간은 구조화된 원본이 있을 때만 일정 계산에 쓴다.
- 혼잡도에는 `live`, `forecast`, `unknown` basis와 조회시각을 보존한다.

### 6.4 동시성과 commit

- 모든 generate 호출은 `generationId`, `inputRevision`, `inputFingerprint`를 가진다.
- 새 generate가 시작되면 이전 AbortController를 취소한다.
- 비동기 결과를 commit하기 직전에 현재 revision과 fingerprint를 다시 비교한다.
- stale 결과는 버리고 사용자 오류로 표시하지 않는다.
- stage는 공유 mutable context를 직접 수정하지 않고 결과를 반환한다.

---

## 7. 목표 사용자 흐름

```text
장소 탐색
  → 장소 저장
  → [선택 완료 · 다음]
  → 지역 축제/산책로 검토
  → 저장 장소 주변 검토
  → 코스에 넣을 항목·시작 장소·순서 확정
  → 계획 조건 입력
      - 여행 날짜
      - 일정 시작 시각
      - 하루 종료 희망 시각(선택)
      - 여행 속도
      - 기본/장소별 체류시간
      - 마지막 장소 종료 또는 출발지 복귀
  → 계획 생성
  → 준비 완료 / 일부 정보 미상 / 수정 필요
  → 계획 수정 또는 PDF 저장
```

### 7.1 화면 상태 머신

```text
selecting
  └─ COMPLETE_SELECTION → supplemental-review
supplemental-review
  └─ all required review events complete → course-config
course-config
  └─ CONFIRM_COURSE → plan-setup
plan-setup
  └─ GENERATE → generating
generating
  ├─ success → ready
  ├─ degraded → partial
  └─ invalid input → blocked
ready | partial
  └─ command → dirty → generating
```

- `CONFIRM_COURSE` 뒤 데스크톱은 계획 조건 영역으로 scroll/focus한다.
- 모바일은 여행 보드 drawer를 열고 계획 조건 첫 입력으로 focus한다.
- 선택, 순서, 날짜, 시간, 체류시간이 바뀌면 기존 경로를 “최신”으로 표시하지 않는다.
- 다음 행동 버튼은 현재 phase마다 하나만 primary CTA로 둔다.

---

## 8. 목표 아키텍처

```text
SearchExperience / CourseBuilder / PlanSetup
                    │ commands
                    ▼
              usePlanningSession
                    │ validated request snapshot
                    ▼
            PlanningOrchestrator
       ┌────────────┼───────────────┐
       ▼            ▼               ▼
 Selection     Route/Traffic      Budget
  stage           stage            stage
       │            │               │
       └──────┬─────┘               │
              ▼                     │
         Schedule stage ◀───────────┘
              │
              ▼
         Report + Validate
              │ atomic commit
              ▼
        TravelPlanV2 / Report VM
              │
       ┌──────┴────────┐
       ▼               ▼
   PlanBuilder       Print view
```

외부 의존성은 stage에 직접 들어가지 않는다.

```text
Route stage → RoutingProvider interface
                    ├─ DirectionsApiProvider → /api/directions → Kakao
                    └─ CoordinateOnlyProvider → Haversine

Optional text box → PlannerLanguageAdapter
                    ├─ Disabled/RuleBased adapter
                    └─ OpenAI adapter → /api/planner/interpret
```

---

## 9. 참고 소스에서 가져오는 것과 버리는 것

| 참고 소스 개념 | V2 적용 | 적용 방식 |
|---|---|---|
| `AgentContext` | 사용 | 검증된 `PlanningSessionV1`과 stage 결과/trace |
| 얇은 planner orchestrator | 사용 | 명시적 DAG와 단일 commit |
| transport/activity/budget 역할 분리 | 사용 | 결정론적 TypeScript stage로 변환 |
| 병렬 specialist 실행 | 제한 사용 | 서로 독립인 route/budget 준비만 병렬, 공유 state 수정 금지 |
| invocation trace | 사용 | 시간, source, issue, cache 여부만 기록 |
| 부분 수정 후 재계산 | 사용 | typed command와 dependency map |
| 모든 specialist의 LLM 호출 | 폐기 | provider와 규칙 코드가 사실을 소유 |
| LLM이 장소·시간·가격 생성 | 폐기 | 입력 ID와 provider 수치만 허용 |
| import 시 OpenAI key 강제 | 폐기 | optional adapter로 격리 |
| `Any`/dict와 regex JSON 파싱 | 폐기 | Zod discriminated union |
| 프로세스 전역 session map | 폐기 | local repository, 향후 서버 repository interface |
| 대안 비용을 모두 더하는 budget | 폐기 | 사용자가 포함한 line만 합산 |

---

## 10. 파일 구조

```text
src/domain/planning/
  contracts.ts
  schemas.ts
  issues.ts
  fingerprint.ts
  commands.ts
  dependency-map.ts
  orchestrator.ts
  stages/
    normalize-selection.ts
    build-route-legs.ts
    forecast-route-legs.ts
    build-schedule.ts
    calculate-budget.ts
    build-report.ts
    validate-plan.ts
  providers/
    routing-provider.ts
    coordinate-only-provider.ts
  __tests__/
    schemas.test.ts
    normalize-selection.test.ts
    build-route-legs.test.ts
    forecast-route-legs.test.ts
    build-schedule.test.ts
    calculate-budget.test.ts
    commands.test.ts
    orchestrator.test.ts

src/contracts/
  directions.ts
  nearby.ts

src/services/planning/
  directions-client.ts

src/data/plans/
  plan-repository.ts
  local-plan-repository.ts
  migrations.ts
  local-plan-repository.test.ts

src/features/planner/
  usePlanningSession.ts
  build-plan-report-view-model.ts
  PlanSetup.tsx
  PlanStatus.tsx
  PlanReport.tsx
  PlanBuilder.tsx

src/features/search/
  planning-item-adapter.ts
  SearchExperience.tsx
```

처음부터 파일을 모두 만들 필요는 없다. 18장의 구현 순서대로 생성한다.

---

## 11. 핵심 데이터 계약

아래 이름과 의미를 구현 기준으로 사용한다. runtime 입력은 같은 구조의 Zod schema로 검증하고 TypeScript 타입은 `z.infer`로 만든다.

### 11.1 선택 항목

```ts
type PlanningItemRole = "core" | "supplemental";

type PlanningItemKind =
  | "place"
  | "festival"
  | "trail"
  | "nearby-catalog"
  | "nearby-service";

type PetAdmissionStatus =
  | "confirmed"
  | "not-evaluated"
  | "unverified"
  | "not-applicable";

type QualificationStatus =
  | "exact-match"
  | "confirmed-non-match"
  | "unverified"
  | "not-evaluated"
  | "not-applicable";

type PlanningItemSnapshot = {
  id: string;
  name: string;
  address: string | null;
  category: string;
  role: PlanningItemRole;
  kind: PlanningItemKind;
  selectedAt: string;
  source: {
    provider: "catalog" | "tour-api" | "trail-db" | "auxiliary-db" | "kakao-local";
    sourceId: string;
    observedAt: string | null;
    sourceUrl: string | null;
  };
  coordinates: { latitude: number; longitude: number } | null;
  qualification: {
    status: QualificationStatus;
    queryFingerprint: string | null;
    hardConstraintKeys: string[];
    proof: Array<{
      conditionKey: string;
      sourceText: string;
      sourceUrl: string | null;
      observedAt: string | null;
      evidenceClass: "policy-text" | "provider-field" | "user-confirmation";
    }>;
  };
  petAdmission: {
    status: PetAdmissionStatus;
    evidenceText: string | null;
    needsConfirmation: boolean;
  };
  activityWindow: {
    startsOn: string | null;
    endsOn: string | null;
    opensAt: string | null;
    closesAt: string | null;
    officialDurationMinutes: number | null;
  } | null;
  userDwellMinutes: number | null;
  userCostKrw: number | null;
};
```

규칙:

- `coordinates === null`인 항목은 경로 node가 아니라 `unscheduledItems`로 간다.
- `source.provider === "kakao-local"`이라는 사실만으로 pet admission을 확인했다고 보지 않는다.
- 축제의 좌표가 있어도 `qualification.status`나 `petAdmission.status`를 확인된 값으로 바꾸지 않는다.
- 검색 조건 적합성은 `qualification`, 실제 반려동물 입장 확인 상태는 `petAdmission`이 담당한다.
- `selectedAt`은 사용자가 고른 시각, `source.observedAt`은 원천 데이터 관측시각이다. 둘을 대신 사용할 수 없으며 둘 다 최신 영업 여부를 보장하지 않는다.
- festival의 `YYYYMMDD` 날짜는 adapter에서 `YYYY-MM-DD`로 정규화하고, 주소가 없으면 빈 문자열이 아니라 `null`을 쓴다.

### 11.2 계획 요청

```ts
type PlanningRequestV1 = {
  schemaVersion: 1;
  planId: string;
  revision: number;
  locale: "ko" | "en" | "zh";
  timeZone: "Asia/Seoul";
  region: string;
  qualificationContext: {
    queryFingerprint: string;
    dataSnapshotId: string;
    matchRuleVersion: string;
    petProfileRevision: number;
    hardConstraintKeys: string[];
    preferenceKeys: string[];
    categoryKeys: string[];
    preparationFilterKeys: string[];
    petProfile: {
      size: "smallDog" | "mediumDog" | "largeDog" | null;
      weightKg: number | null;
      dangerousDog: boolean;
    };
  };
  selectedItems: PlanningItemSnapshot[];
  includedItemIds: string[];
  orderedItemIds: string[];
  nearbyAnchorId: string | null;
  startItemId: string | null;
  endPolicy: "last-item" | "return-to-start";
  settings: {
    tripDate: string;             // YYYY-MM-DD
    startTime: string;            // HH:mm
    dayEndTime: string | null;    // HH:mm
    transportMode: "car";
    pace: "relaxed" | "balanced" | "packed";
    orderMode: "nearby" | "saved" | "manual";
    defaultDwellMinutes: number;
    defaultDwellSource: "preset" | "user";
    budgetKrw: number | null;
    includeTollsInBudget: boolean;
  };
};
```

`selectedItems`는 여행 보드에 저장된 전체 snapshot, `includedItemIds`는 이번 계획에 넣기로 확정한 항목, `orderedItemIds`는 그중 좌표가 있어 경로에 배치한 항목이다. 좌표가 없는 included item은 `unscheduledItems`에 남으며, 단순히 코스에서 제외한 항목은 계획서에 나오지 않는다.

선택/검토 phase에서는 `startItemId`가 `null`일 수 있다. 코스를 확정하거나 생성할 때는 `startItemId === orderedItemIds[0]`이어야 한다. 시작 장소를 바꾸는 command가 들어오면 reducer가 order mode에 따라 나머지를 다시 정렬한 뒤 request를 저장한다. 첫 구현에서 `startTime`은 해당 첫 방문지의 일정 시작 시각이다. 현재 위치나 집에서 첫 방문지까지의 구간은 V1 범위에 포함하지 않으며, 향후 별도 `origin` union으로 추가한다. 이렇게 해야 주변 검색 기준점과 일정 시작 장소를 혼동하지 않는다.

첫 배포 UI의 기본값:

- `tripDate`: 내일
- `startTime`: `09:00`
- `dayEndTime`: `20:00`
- `pace`: `balanced`
- `defaultDwellMinutes`: `90`
- `defaultDwellSource`: `preset`
- `startItemId`: 코스 첫 항목
- `endPolicy`: `last-item`
- `includeTollsInBudget`: `false`

`pace`는 UI preset이다. `relaxed/ balanced/ packed`를 고르면 `defaultDwellSource === "preset"`일 때만 기본 체류시간을 각각 `120/90/60분`으로 설정한다. 사용자가 기본 체류시간을 직접 바꾸면 source를 `user`로 바꾸고 이후 pace 변경은 그 값을 덮지 않는다. 실제 계산은 항상 저장된 `defaultDwellMinutes`와 장소별 override를 사용한다.

### 11.3 경로 사실

```ts
type RouteLeg = {
  id: string;
  fromItemId: string;
  toItemId: string;
  basis: "provider-road" | "coordinate-only";
  provider: "kakao" | "haversine";
  distanceKm: number;
  durationMinutes: number | null;
  durationBasis: "live" | "forecast" | "unknown";
  trafficDetailsBasis: "live" | "unavailable";
  forecastDepartureAt: string | null;
  fetchedAt: string | null;
  congestedRoads: Array<{
    name: string;
    distanceMeters: number;
    speedKph: number;
    state: "slow" | "congested" | "jammed";
  }>;
  cost: {
    taxiFareKrw: number | null;
    tollFeeKrw: number | null;
  };
  mapLink: string;
  naviLink: string;
  issueCode: "ROUTE_PROVIDER_UNAVAILABLE" | "ROUTE_TIMEOUT" | "NO_ROUTE" | null;
};
```

### 11.4 일정과 결과

```ts
type ScheduleEntry = {
  itemId: string;
  sequence: number;
  date: string;
  startsAt: string | null;       // RFC 3339 with +09:00, e.g. 2026-08-20T09:00+09:00
  endsAt: string | null;
  dwellMinutes: number;
  dwellSource: "official" | "user" | "default";
  incomingLegId: string | null;
  outgoingLegId: string | null;
};

type PlanIssueSeverity = "info" | "warning" | "blocking";

type PlanningStageName =
  | "validate-input"
  | "normalize-selection"
  | "build-route-legs"
  | "build-provisional-schedule"
  | "forecast-route-legs"
  | "build-final-schedule"
  | "calculate-budget"
  | "build-report"
  | "validate-plan";

type PlanIssueCode =
  | "INVALID_INPUT"
  | "UNKNOWN_ITEM_ID"
  | "NO_SELECTED_ITEMS"
  | "NOT_ENOUGH_ROUTE_NODES"
  | "TOO_MANY_ROUTE_NODES"
  | "HARD_CONSTRAINT_MISMATCH"
  | "QUALIFICATION_CONTEXT_MISMATCH"
  | "ITEM_WITHOUT_COORDINATES"
  | "PET_POLICY_UNVERIFIED"
  | "ACTIVITY_OUTSIDE_DATE"
  | "OUTSIDE_OPENING_WINDOW"
  | "ROUTE_PROVIDER_UNAVAILABLE"
  | "ROUTE_TIMEOUT"
  | "NO_ROUTE"
  | "ROUTE_DATA_STALE"
  | "SCHEDULE_UNKNOWN_AFTER_LEG"
  | "DAY_OVERFLOW"
  | "INTERNAL_PLAN_INVARIANT";

type SessionNoticeCode =
  | "STORAGE_UNAVAILABLE"
  | "STALE_GENERATION"
  | "GENERATION_ABORTED";

type SessionNotice = {
  code: SessionNoticeCode;
  params: Record<string, string | number | boolean | null>;
};

type PlanIssue = {
  code: PlanIssueCode;
  severity: PlanIssueSeverity;
  stage: PlanningStageName;
  itemId: string | null;
  legId: string | null;
  params: Record<string, string | number | boolean | null>;
};

type TravelPlanV2 = {
  schemaVersion: 2;
  id: string;
  revision: number;
  inputFingerprint: string;
  status: "ready" | "partial";
  request: PlanningRequestV1;
  scheduledItems: ScheduleEntry[];
  unscheduledItemIds: string[];
  legs: RouteLeg[];
  departureRecommendation: {
    legId: string;
    currentDepartureAt: string;
    currentDurationMinutes: number | null;
    recommendedDepartureAt: string;
    recommendedDurationMinutes: number;
    comparisonCount: number;
    isAlreadyApplied: boolean;
  } | null;
  scheduleSummary: {
    startsAt: string;
    endsAt: string | null;
    returnArrivalAt: string | null;
  };
  budget: BudgetSummary;
  issues: PlanIssue[];
  report: PlanReportModel;
  provenance: {
    plannerVersion: string;
    routingCapabilities: Array<"provider-road" | "coordinate-only">;
    generatedAt: string;
  };
};
```

`status` 계산:

- blocking issue가 있으면 `TravelPlanV2`를 만들지 않고 generation을 reject한다.
- blocking은 없고 warning이 있으면 생성된 plan은 `partial`이다.
- warning도 없으면 `ready`다.

### 11.5 단계 결과와 trace

```ts
type StageResult<T> =
  | { ok: true; data: T; issues: PlanIssue[]; trace: StageTrace }
  | { ok: false; data: null; issues: PlanIssue[]; trace: StageTrace };

type StageTrace = {
  stage: PlanningStageName;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  source: "local-rule" | "local-cache" | "provider";
  cacheHit: boolean;
  inputRevision: number;
};

type GenerationOutcome =
  | { kind: "generated"; plan: TravelPlanV2 }
  | { kind: "rejected"; issues: PlanIssue[] };

type GenerationEnvelope = {
  generationId: string;
  inputRevision: number;
  inputFingerprint: string;
  outcome: GenerationOutcome;
};
```

trace에는 API key, 정확한 현재 위치, pet 이름, 원문 전체를 로그로 남기지 않는다.

---

## 12. Stage별 책임과 알고리즘

### 12.1 `normalize-selection`

입력:

- `PlanningRequestV1`

출력:

- route 가능한 ordered items
- coordinate가 없는 unscheduled items
- admission 확인 경고

알고리즘:

1. Zod parse한다.
2. item ID 중복을 거부한다.
3. `includedItemIds`가 `selectedItems`의 ID만 참조하는지 확인한다.
4. `orderedItemIds`가 included item 중 좌표 있는 ID만 정확히 한 번 참조하는지 확인한다.
5. generate 시 `startItemId`가 null이 아니고 `startItemId === orderedItemIds[0]`인지 확인한다.
6. 사용자가 선택하지 않은 ID는 즉시 `UNKNOWN_ITEM_ID` blocking issue로 처리한다.
7. core/supplemental, qualification, pet admission 상태를 보존한다.
8. 좌표가 없는 included item은 삭제하지 않고 `ITEM_WITHOUT_COORDINATES` warning과 함께 unscheduled로 분리한다.
9. 좌표가 있지만 included가 아닌 항목은 사용자가 코스에서 제외한 것이므로 결과와 report에서 제외한다.
10. hard 조건 snapshot이 있는 core item은 `qualification.status === "exact-match"`여야 한다. `confirmed-non-match`나 `unverified`면 `HARD_CONSTRAINT_MISMATCH`로 reject하고 자동 완화하지 않는다.
11. included core item의 `qualification.queryFingerprint`가 모두 현재 `qualificationContext.queryFingerprint`와 같아야 한다. 다르면 `QUALIFICATION_CONTEXT_MISMATCH`로 reject한다. supplemental item의 값은 `null`이어야 한다.
12. included item의 `petAdmission.needsConfirmation === true`면 `PET_POLICY_UNVERIFIED` warning과 PDF 확인 항목을 만든다. `not-applicable`은 경고로 승격하지 않는다.
13. route node가 2개보다 적으면 `NOT_ENOUGH_ROUTE_NODES`, 12개를 넘으면 `TOO_MANY_ROUTE_NODES` blocking issue를 반환한다.

Migration 동안 기존 DTO는 다음 규칙으로만 변환한다.

- `festival:` → `supplemental/festival/unverified`
- `trail:` → `supplemental/trail/unverified`
- `nearby-service:` → `supplemental/nearby-service`
- 정적 auxiliary ID → `supplemental/nearby-catalog`
- 그 외 catalog ID → `core/place`

이 ID 추론은 임시 adapter에서만 허용하고 domain stage에는 넣지 않는다.

adapter는 source별 진입점을 분리한다.

```ts
toCorePlanningItem(result: MatchEvaluation, selectedAt: string): PlanningItemSnapshot;
toFestivalPlanningItem(festival: FestivalData, selectedAt: string): PlanningItemSnapshot;
toTrailPlanningItem(trail: TrailData, selectedAt: string): PlanningItemSnapshot;
toAuxiliaryPlanningItem(place: AuxiliaryPlace, selectedAt: string): PlanningItemSnapshot;
toNearbyServicePlanningItem(service: NearbyServiceDto, selectedAt: string): PlanningItemSnapshot;
```

`NearbyServiceDto`는 현재 `NearbyServices.tsx` 안의 private `Service` 타입을 `src/contracts/nearby.ts`로 옮긴 공유 response 타입이다. 정상 경로는 `MatchEvaluation`에서 proof를 잃기 전에 snapshot을 만든다. `PlanPlace.exact`와 `policySourceText`만 받는 legacy 변환은 화면 migration 중에만 허용하며, proof가 없으면 임의로 채우지 않고 `qualification.status: not-evaluated`로 내린다.

`MatchEvaluation` 변환은 다음을 고정한다.

- `exact === true`와 `status === "confirmed-match"` → `exact-match`
- `status === "confirmed-non-match"` → `confirmed-non-match`
- `status === "unverified"` → `unverified`
- hard 조건이 없는 browse 결과 → `not-evaluated`
- supplemental source → `not-applicable`

proof의 source text, source URL, 관측시각, evidence class를 가능한 만큼 복사한다. 없는 값을 selection 시각으로 대체하지 않는다.

검색 query fingerprint는 page, sort, locale을 제외하고 `dataSnapshotId + matchRuleVersion + region + hard/preference/category/preparation keys + pet profile revision/value`의 canonical JSON으로 만든다. 사용자는 여러 페이지에서 장소를 저장할 수 있지만 서로 다른 조건이나 pet profile에서 저장한 core item을 한 plan에 섞을 수 없다. 검색 조건이 바뀌면 기존 core item은 여행 보드에 남겨도 course confirmation을 무효화하고, 현재 query에서 다시 확인·저장하거나 제거하기 전에는 generate하지 않는다.

source adapter acceptance:

- festival `startDate/endDate`의 `YYYYMMDD`를 유효한 `YYYY-MM-DD`로 바꾸고 잘못된 날짜는 `null` 처리한다.
- `mapx/mapy`가 숫자 범위 검사를 통과할 때만 coordinates를 만든다.
- festival/trail 주소가 없으면 `null`이며 UI adapter가 `주소 정보 없음`으로 번역한다.
- trail `crs_totl_rqrm_hour`는 현재 화면과 동일하게 분 단위 원본으로 취급해 `officialDurationMinutes`에 넣고, 음수·비정상 값은 `null`로 둔다.
- source가 `HHmm` 운영시간을 제공하면 `HH:mm`으로 정규화하고, 문자열 설명에서 임의로 영업시간을 추출하지 않는다.

### 12.2 `build-route-legs`와 `forecast-route-legs`

입력:

- route 가능한 ordered items
- start/end policy
- `RoutingProvider`
- `AbortSignal`

알고리즘:

1. 인접한 route node마다 한 leg를 만든다.
2. `return-to-start`이면 마지막 node에서 start로 돌아가는 leg를 추가한다.
3. provider 호출은 최대 동시성 3으로 제한한다.
4. 각 leg 실패는 그 leg만 Haversine fallback으로 바꾼다.
5. fallback의 `durationMinutes`는 `null`이다.
6. provider response의 거리, 시간, 조회시각, 비용, 링크를 손실 없이 복사한다.
7. 모든 base leg를 만든 뒤 provisional schedule을 한 번 계산한다.
8. 첫 실제 이동 leg의 계산된 **현재 출발시각**을 기준으로 `-60/0/+60분` 후보를 비교한다. 현재보다 최소 5분 이후 후보만 사용한다.
9. `0분` 후보가 성공하면 그 값만 현재 leg의 `durationMinutes`, `durationBasis: forecast`, `forecastDepartureAt`에 반영하고 final schedule을 다시 계산한다.
10. 가장 빠른 다른 후보는 advisory `departureRecommendation`으로만 보존한다. 추천 후보의 duration을 현재 일정에 덮어쓰지 않는다.
11. 사용자가 “추천 시각 적용”을 누르면 `APPLY_DEPARTURE_RECOMMENDATION` command가 leg ID와 source revision을 현재 draft와 검증한 뒤 첫 방문 시작시각을 `추천 이동 출발시각 - 첫 방문 dwell`로 바꾸고 전체 계획을 새 revision으로 다시 생성한다. 계산된 시작이 여행일 범위를 벗어나면 command를 거부한다. 별도의 대기시간을 암묵적으로 넣지 않는다.
12. live 혼잡 상세와 forecast 이동시간은 서로 다른 필드로 보존한다. forecast duration을 썼더라도 `congestedRoads`가 live 응답이면 `trafficDetailsBasis: live`라고 보고서에 명시한다.
13. 현재 출발시각 후보가 실패하면 live duration 또는 coordinate-only fallback을 유지하되 다른 후보를 현재 일정 시간으로 사용하지 않는다.
14. 첫 배포에서는 첫 실제 이동 leg만 출발시각 후보를 비교한다. 이후 leg 예측은 별도 성능 측정 후 확장한다.
15. 동일 generation 안에서 중복된 `from/to 좌표 + departure 15분 bucket` 요청만 Promise dedupe한다. generation이 resolve/reject/abort되면 map을 폐기하며 다음 generate에서 live/future 응답을 재사용하지 않는다.

첫 구현에서는 기존 `/api/directions`를 유지하고 공유 schema로 감싼다. stage 안에서 `fetch`를 직접 호출하지 않는다.

### 12.3 `build-schedule`

입력:

- ordered items
- route legs
- settings

알고리즘:

1. `startItemId` 장소의 `startsAt = tripDate + startTime`이다.
2. 첫 장소도 dwell을 적용한다.
3. `endsAt = startsAt + dwellMinutes`다.
4. outgoing leg의 출발시각은 해당 장소의 `endsAt`이다.
5. 다음 `startsAt = 이전 endsAt + leg.durationMinutes`다.
6. leg duration이 `null`이면 다음 장소부터 모든 absolute time을 `null`로 cascade한다. 순서와 dwell 값은 유지한다.
7. 장소별 user dwell, 공식 activity duration, 기본 dwell 순서로 값을 선택한다. pace label 자체로 시간을 다시 계산하지 않는다.
8. `dayEndTime`을 넘으면 항목을 숨기지 않고 `DAY_OVERFLOW` warning을 낸다.
9. 축제 날짜가 trip date 범위 밖이면 `ACTIVITY_OUTSIDE_DATE` warning을 낸다.
10. 운영시간과 일정 시간이 명백히 충돌하면 `OUTSIDE_OPENING_WINDOW` warning을 낸다.

시간 계산은 브라우저 locale이나 host timezone에 의존하지 않는다. request의 `tripDate`와 `HH:mm`은 순수 parser로 검증하고, 일정 산술은 KST 기준 epoch minute 또는 `date + minuteOfDay` 정수로 수행한다. offset 없는 문자열을 `new Date("YYYY-MM-DDTHH:mm")`에 넘기는 구현은 금지한다. 생성 결과의 instant는 `2026-08-20T09:00+09:00`처럼 `+09:00`을 포함한 RFC 3339 문자열로 저장하고 provider용 `yyyyMMddHHmm`은 같은 KST components에서 만든다. 테스트는 최소 `TZ=UTC`와 `TZ=America/Los_Angeles` 환경에서도 같은 결과를 확인한다.

V2는 1일 flat schedule로 고정한다. 다일 계획은 실제 `DaySchedule[]` 계약과 schema migration을 설계하는 다음 버전에서 추가하며, 존재하지 않는 `days[]` 확장성을 V2가 보장한다고 주장하지 않는다.

### 12.4 `calculate-budget`

첫 배포에서도 구조는 만들되 UI는 선택 기능으로 둔다.

- 사용자 입력 비용, provider가 반환한 선택 경로의 통행료·택시비만 line item으로 넣는다.
- item 비용은 `includedItemIds`에 있는 항목만 합산한다. 여행 보드에만 남고 코스에서 제외한 항목은 합산하지 않는다.
- 택시비는 transport mode가 `car`일 때 총액에 자동 합산하지 않는다. 참고 정보로만 둔다.
- 통행료는 사용자가 “통행료 포함”을 켰을 때만 합산한다.
- 값이 없는 항목은 0으로 바꾸지 않고 `unknownItemCount`에 넣는다.

```ts
type BudgetSummary = {
  knownTotalKrw: number;
  unknownItemCount: number;
  remainingKrw: number | null;
  overBudget: "yes" | "no" | "unknown";
  lines: Array<{
    id: string;
    itemId: string | null;
    labelCode: "ITEM_COST" | "TOLL_FEE" | "TAXI_FARE_REFERENCE";
    labelParams: Record<string, string | number>;
    amountKrw: number | null;
    source: "user" | "routing-provider";
    includedInTotal: boolean;
  }>;
};
```

### 12.5 `build-report`

LLM 없이 locale 독립적인 report model을 만든다. 이 model만 `TravelPlanV2`에 저장한다.

```ts
type PlanReportModel = {
  overview: {
    tripDate: string;
    region: string;
    startsAt: string;
    endsAt: string | null;
    recommendedFirstMoveAt: string | null;
    scheduledCount: number;
    unscheduledCount: number;
    totalDistanceKm: number;
    distanceBasis: "road" | "mixed" | "coordinate-only";
    totalKnownTravelMinutes: number;
    unknownLegCount: number;
  };
  visits: Array<{
    sequence: number;
    itemId: string;
    startsAt: string | null;
    endsAt: string | null;
    dwellMinutes: number;
    issueCodes: PlanIssueCode[];
  }>;
  movements: Array<{
    sequence: number;
    legId: string;
    fromItemId: string;
    toItemId: string;
    departureAt: string | null;
    arrivalAt: string | null;
    distanceKm: number;
    durationMinutes: number | null;
    durationBasis: RouteLeg["durationBasis"];
    trafficDetailsBasis: RouteLeg["trafficDetailsBasis"];
    fetchedAt: string | null;
    forecastDepartureAt: string | null;
    congestedRoads: RouteLeg["congestedRoads"];
    mapLink: string;
    naviLink: string;
    issueCodes: PlanIssueCode[];
    isReturnLeg: boolean;
  }>;
  unscheduled: Array<{ itemId: string; reasonCode: PlanIssueCode }>;
  confirmationItemIds: string[];
  budget: BudgetSummary;
};

type PlanReportViewModel = {
  title: string;
  statusCode: "READY" | "PARTIAL";
  overview: {
    dateLabel: string;
    regionLabel: string;
    startLabel: string;
    endLabel: string;
    recommendedFirstMoveLabel: string | null;
    distanceLabel: string;
    travelTimeLabel: string;
    unknownLegLabel: string | null;
  };
  rows: Array<{
    sequence: number;
    itemName: string;
    addressLabel: string;
    arrivalLabel: string;
    departureLabel: string;
    dwellLabel: string;
    verificationLabel: string;
  }>;
  movements: Array<{
    sequence: number;
    fromName: string;
    toName: string;
    departureLabel: string;
    arrivalLabel: string;
    distanceLabel: string;
    durationLabel: string;
    trafficLabel: string;
    basisLabel: string;
    freshnessLabel: string;
    mapLink: string;
    naviLink: string;
  }>;
  unscheduled: Array<{ name: string; reasonLabel: string; detail: string }>;
  confirmationItems: Array<{ itemId: string; label: string }>;
  budget: {
    knownTotalLabel: string;
    remainingLabel: string | null;
    unknownCountLabel: string | null;
    overBudgetLabel: string | null;
    lines: Array<{ id: string; label: string; amountLabel: string; includedInTotal: boolean }>;
  };
};
```

domain은 code, ID, 시간, 수치만 반환한다. `buildPlanReportViewModel(report, items, locale, dictionary)`가 render 시점에 번역 label을 만든다. locale 변경은 저장된 plan이나 경로를 재생성하지 않는다.

### 12.6 `validate-plan`

최종 commit 전에 아래를 검사한다.

- scheduled item ID가 입력에 존재한다.
- 입력에 없는 숫자·장소가 생기지 않았다.
- leg 수가 route node 수와 end policy에 맞다.
- known 시각은 단조 증가한다.
- coordinate-only leg의 duration이 null이다.
- provider-road leg는 provenance를 가진다.
- qualification과 pet admission 상태가 normalize 전보다 높아지지 않았다.
- report visit가 scheduled item과 1:1 대응하고 movement가 leg와 1:1 대응한다.

검증 실패는 `INTERNAL_PLAN_INVARIANT` blocking issue로 처리하고 이전 valid draft를 유지한다.

---

## 13. 오케스트레이터 계약

```ts
type PlanningDependencies = {
  routingProvider: RoutingProvider;
  fallbackRoutingProvider: RoutingProvider;
  clock: { now(): Date };
  idFactory: { create(): string };
};

type GenerateOptions = {
  signal: AbortSignal;
  generationId: string;
};

interface PlanningOrchestrator {
  generateCandidate(
    request: PlanningRequestV1,
    dependencies: PlanningDependencies,
    options: GenerateOptions,
  ): Promise<GenerationEnvelope>;
}
```

실행 순서:

```text
1. validate request schema
2. normalize selection
3. build initial ordered route nodes
4. run base route legs with bounded concurrency
5. build provisional schedule
6. forecast the first movable leg when its departure time is known
7. build final schedule with only the current-departure forecast; keep other candidates advisory
8. calculate budget
9. build locale-independent report model
10. validate all invariants
```

`Promise.allSettled`는 leg별 provider 호출에 사용한다. 각 stage가 같은 draft를 동시에 수정하는 방식으로 사용하지 않는다.

오케스트레이터는 React/session state를 읽거나 직접 commit하지 않는다. `usePlanningSession`이 생성 시작 시 `{generationId, inputRevision, inputFingerprint}`를 reducer의 `activeGeneration`에 저장한다. 결과가 오면 `COMMIT_GENERATION(envelope)` event를 dispatch하고 reducer가 세 값을 최신 state와 모두 비교한다. 하나라도 다르면 `STALE_GENERATION`으로 조용히 폐기한다. 모두 같을 때만 generated plan을 `draft`와 `lastValidDraft`에 한 번에 commit한다. rejected outcome이면 `lastValidDraft`는 유지하고 blocking issue만 session에 저장한다.

### 13.1 결정성

- 같은 입력과 같은 provider 결과는 ID와 생성시각을 제외하고 동일한 plan을 만든다.
- 가까운 순서의 거리 동률은 `name.localeCompare("ko")`, 그다음 ID 순서로 결정한다.
- 테스트에서는 clock과 idFactory를 고정한다.

`inputFingerprint`는 canonical JSON의 SHA-256이다. `planId`, qualification context, included/order/start/end, item snapshot, 날짜·시간·체류·예산 설정을 포함한다. `revision`, UI locale, phase, generation ID, provider 결과는 제외한다. `selectedItems`는 ID로 정렬해 canonicalize하지만 `orderedItemIds` 배열 순서는 그대로 보존한다. 같은 helper를 generation 시작과 reducer commit guard가 공유한다.

---

## 14. 수정 command와 선택적 재계산

```ts
type PlannerCommand =
  | { type: "SET_QUALIFICATION_CONTEXT"; context: PlanningRequestV1["qualificationContext"] }
  | { type: "SET_ITEM_INCLUDED"; itemId: string; included: boolean }
  | { type: "REORDER_ITEMS"; orderedItemIds: string[] }
  | { type: "REMOVE_ITEM"; itemId: string }
  | { type: "SET_ITEM_DWELL"; itemId: string; minutes: number | null }
  | { type: "SET_DEFAULT_DWELL"; minutes: number }
  | { type: "RESET_DEFAULT_DWELL_TO_PACE" }
  | { type: "SET_TRIP_DATE"; date: string }
  | { type: "SET_START_TIME"; time: string }
  | { type: "SET_DAY_END_TIME"; time: string | null }
  | { type: "SET_PACE"; pace: "relaxed" | "balanced" | "packed" }
  | { type: "SET_ORDER_MODE"; mode: "nearby" | "saved" | "manual" }
  | { type: "SET_START_ITEM"; itemId: string }
  | { type: "APPLY_DEPARTURE_RECOMMENDATION"; legId: string; recommendedDepartureAt: string; sourceRevision: number }
  | { type: "SET_END_POLICY"; policy: "last-item" | "return-to-start" }
  | { type: "SET_BUDGET"; amountKrw: number | null }
  | { type: "SET_ITEM_COST"; itemId: string; amountKrw: number | null }
  | { type: "SET_INCLUDE_TOLLS"; included: boolean };
```

모든 command는 Zod 검증 후 `revision + 1`을 수행한다.

- `SET_DEFAULT_DWELL`은 15~480분만 허용하고 `defaultDwellSource`를 `user`로 바꾼다.
- `SET_PACE`는 pace를 바꾸되 source가 `preset`일 때만 120/90/60분 mapping을 적용한다.
- `RESET_DEFAULT_DWELL_TO_PACE`는 source를 `preset`으로 돌리고 현재 pace mapping을 적용한다.

언어 변경은 planning command가 아니다. `LangContext`가 `PlanningRequestV1.locale` 표시값을 동기화하되 planning revision과 fingerprint는 바꾸지 않고 view-model adapter만 다시 실행한다.

request를 바꾸는 `PlannerCommand`와 화면/session 생명주기를 바꾸는 event는 분리한다.

```ts
type PlanningSessionEvent =
  | { type: "COMPLETE_SELECTION" }
  | { type: "SET_NEARBY_ANCHOR"; itemId: string | null }
  | { type: "COMPLETE_REGIONAL_REVIEW"; region: string }
  | { type: "INVALIDATE_REGIONAL_REVIEW"; region: string }
  | { type: "COMPLETE_NEARBY_REVIEW"; anchorItemId: string }
  | { type: "INVALIDATE_NEARBY_REVIEW"; anchorItemId: string }
  | { type: "CONFIRM_COURSE" }
  | { type: "GENERATION_STARTED"; generationId: string; inputRevision: number; inputFingerprint: string }
  | { type: "COMMIT_GENERATION"; envelope: GenerationEnvelope }
  | { type: "GENERATION_ABORTED"; generationId: string }
  | { type: "RETRY_LEG"; legId: string }
  | { type: "RESET_PLANNING_SESSION" };
```

transition guard:

| event | 필수 조건 | 다음 phase |
|---|---|---|
| `COMPLETE_SELECTION` | 저장 항목 1개 이상 | review 필요 시 `supplemental-review`, 아니면 `course-config` |
| regional/nearby review 완료 event | 아래 derived review가 모두 완료 | `course-config` |
| `CONFIRM_COURSE` | regional/nearby review 완료, route node 2~12개, `startItemId` 유효 | `plan-setup` |
| `GENERATION_STARTED` | phase가 `plan-setup`, `ready`, `partial`, `blocked` 중 하나 | `generating` |
| generated `COMMIT_GENERATION` | active generation 3개 식별자 일치 | `ready` 또는 `partial` |
| rejected `COMMIT_GENERATION` | active generation 3개 식별자 일치 | `blocked`, 이전 valid draft 유지 |
| `RETRY_LEG` | 해당 leg가 현재 draft에 있고 provider fallback issue 보유 | phase 유지 후 route 일부 재생성 |
| `GENERATION_ABORTED` | generation ID가 active generation과 일치 | last valid draft가 있으면 그 status phase, 없으면 `plan-setup` |

선택 항목, 지역, nearby anchor가 바뀌면 관련 review 완료 상태와 course confirmation을 reducer가 즉시 무효화한다. UI 컴포넌트가 이 규칙을 각자 재구현하지 않는다.

review 필요 여부는 reducer selector가 계산한다.

```ts
const regionalReviewRequired = request.region.trim().length > 0;
const nearbyReviewRequired = request.nearbyAnchorId !== null;
const regionalReviewComplete = !regionalReviewRequired || matchingRegionalReviewCompleted;
const nearbyReviewComplete = !nearbyReviewRequired || matchingNearbyReviewCompleted;
const allReviewsComplete = regionalReviewComplete && nearbyReviewComplete;
```

- `COMPLETE_SELECTION` 시 review가 하나도 필요 없으면 바로 `course-config`로 간다.
- 필요한 review가 있으면 `supplemental-review`에 머문다.
- 각 완료 event 뒤 `allReviewsComplete`가 true가 되는 즉시 `course-config`로 간다. 별도 `COMPLETE_REVIEWS` 버튼/event는 두지 않는다.
- region 변경은 regional review를, anchor 변경은 nearby review를 무효화하고 phase를 `supplemental-review`로 되돌린다.
- supplemental item 포함/제외만 바꾸는 것은 이미 목록을 검토한 결정을 바꾼 것이므로 review를 무효화하지 않는다. course confirmation과 생성 결과만 무효화한다.

선택 변경 command는 field 하나만 바꾸지 않고 `reconcileSelectionMutation()`으로 아래 postcondition을 한 reducer transaction에서 맞춘다.

1. `SET_ITEM_INCLUDED(false)`는 ID를 included/order에서 제거하되 `selectedItems`에는 남긴다.
2. `SET_ITEM_INCLUDED(true)`는 selected ID만 허용한다. 좌표가 있으면 order 끝에 추가하고, 없으면 included에만 추가한다.
3. `REMOVE_ITEM`은 selected/included/order에서 모두 제거한다.
4. 제거·제외한 ID가 start면 남은 `orderedItemIds[0]`을 start로 정하고, 없으면 `null`로 둔다.
5. 제거한 ID가 nearby anchor면 남은 좌표 있는 core selected item 중 저장 순서 첫 항목을 새 anchor로 정한다. 없으면 `null`로 두고 nearby review를 무효화한다. 단순 course 제외는 selected item을 없애지 않으므로 anchor를 유지할 수 있다.
6. `REORDER_ITEMS`는 included routeable ID의 정확한 permutation만 허용한다. 누락·중복·추가 ID가 있으면 command 전체를 거부한다.
7. `SET_START_ITEM`은 included routeable ID만 허용하고 새 start를 배열 첫 항목으로 이동한 뒤 order mode에 맞게 나머지를 다시 계산한다.
8. 선택 관련 변경이 들어오면 active generation을 abort하고 draft를 current에서 분리한다. review가 불완전하면 `supplemental-review`, 완료됐으면 `course-config`로 돌아간다.
9. route node가 2개 미만이면 course confirmation을 무효화하고 `course-config`에 머물며 생성 버튼을 비활성화한다. selected item까지 0개면 `selecting`으로 돌아간다.

command 적용 도중 중간 invalid request를 외부에 노출하지 않는다. clone에서 postcondition을 모두 계산하고 최종 Zod 검증이 성공할 때만 새 request를 한 번에 commit한다.

`SET_QUALIFICATION_CONTEXT`는 선택 mutation helper와 별도로 active generation과 course confirmation을 즉시 무효화한다. 기존 core snapshot은 자동 재인증하지 않으며 board에 남긴다. 사용자가 현재 검색 결과에서 같은 장소를 다시 저장하면 그 item snapshot의 query fingerprint를 교체할 수 있다.

| command | 다시 실행할 단계 |
|---|---|
| include, reorder, remove, start item, end policy | normalize → route → provisional schedule → forecast → final schedule → budget → report → validate |
| qualification context | 기존 core context 비교 → course/generation 무효화, 재확인 전 generate 금지 |
| trip date, start time | provisional schedule → forecast → final schedule → report → validate |
| apply departure recommendation | request start time 갱신 → provisional schedule → forecast → final schedule → report → validate |
| day end time | schedule → report → validate |
| item/default dwell, pace, reset dwell preset | provisional schedule → forecast → final schedule → report → validate |
| budget, item cost, include tolls | budget → report → validate |
| locale | domain stage 재실행 없음, view-model adapter만 다시 실행 |
| retry leg session event | 해당 base leg → provisional schedule → first-leg forecast(영향 시) → final schedule → budget → report → validate |

첫 구현은 undo를 위한 최근 10개 request snapshot을 메모리에 보관한다. localStorage에는 최신 session에서 persistence allowlist에 해당하는 선택 snapshot과 사용자 설정만 저장한다.

---

## 15. RoutingProvider 계약

```ts
type RoutingCapability = "provider-road" | "coordinate-only";

interface RoutingProvider {
  readonly capability: RoutingCapability;
  route(input: {
    from: PlanningItemSnapshot;
    to: PlanningItemSnapshot;
    departureAt: string | null;
  }, signal: AbortSignal): Promise<RouteLeg>;
}
```

구현체:

1. `DirectionsApiProvider`
   - 브라우저에서 `/api/directions`만 호출한다.
   - Zod 공유 schema로 response를 검증한다.
   - API key를 클라이언트로 노출하지 않는다.
2. `CoordinateOnlyProvider`
   - Haversine 거리와 Kakao map/navi link를 만든다.
   - duration, traffic, cost는 null/unknown이다.

provider 선택:

- 요청마다 road provider를 먼저 사용한다.
- 503, 502, 404, timeout, invalid response는 해당 leg만 coordinate-only로 downgrade한다.
- 상위 `AbortSignal` 취소는 provider 실패가 아니다. fallback을 만들지 말고 즉시 generation 전체를 abort한다.
- 사용자가 retry하면 실패한 leg만 다시 요청한다.
- 화면을 닫았다 열었다고 같은 session route를 다시 호출하지 않는다.

공유 directions schema는 API route와 client 양쪽이 import할 수 있는 `src/contracts/directions.ts`에 둔다. 성공/실패 모두 `{success,data,error,meta:{requestId,fetchedAt}}`를 검증한다. `fetchedAt`은 provider 관측시각이 아니라 API route가 성공 응답을 만든 서버 시각이다. status mapping은 503/502 → plan issue `ROUTE_PROVIDER_UNAVAILABLE`, 404 → plan issue `NO_ROUTE`, client timeout → plan issue `ROUTE_TIMEOUT`, 사용자/새 revision abort → session event/notice `GENERATION_ABORTED`다. abort는 `RouteLeg.issueCode`에 넣지 않는다. Node 전용 코드는 공유 schema 파일에 넣지 않는다.

future directions는 summary만 있고 live road detail이 없을 수 있다. base live fixture와 future summary fixture를 각각 둔다. 병합 시 future는 현재 출발 후보의 duration만 갱신하고, base live의 congested roads는 `trafficDetailsBasis: live`로 별도 보존한다. 두 데이터를 같은 시점 관측값처럼 표시하는 구현은 테스트에서 실패시킨다.

---

## 16. Session 상태와 영속화

```ts
type PlanningPhase =
  | "selecting"
  | "supplemental-review"
  | "course-config"
  | "plan-setup"
  | "generating"
  | "ready"
  | "partial"
  | "blocked";

type PlanningSessionV1 = {
  schemaVersion: 1;
  phase: PlanningPhase;
  request: PlanningRequestV1;
  draft: TravelPlanV2 | null;
  lastValidDraft: TravelPlanV2 | null;
  generationIssues: PlanIssue[];
  notices: SessionNotice[];
  activeGeneration: {
    generationId: string;
    inputRevision: number;
    inputFingerprint: string;
    previousPhase: Exclude<PlanningPhase, "generating">;
  } | null;
  dirtyStages: PlanningStageName[];
  regionalReview: { region: string; completed: boolean } | null;
  nearbyReview: { anchorItemId: string; completed: boolean } | null;
};

type PersistedPlanningSessionV1 = Pick<
  PlanningSessionV1,
  "schemaVersion" | "request" | "regionalReview" | "nearbyReview"
> & {
  phase: Exclude<PlanningPhase, "generating" | "ready" | "partial" | "blocked">;
};
```

Repository:

```ts
interface PlanRepository {
  loadActive(): PersistedPlanningSessionV1 | null;
  saveActive(session: PersistedPlanningSessionV1): void;
  clearActive(): void;
}
```

localStorage 규칙:

- key: `gachigalgae:planning-session:v1`
- `window`이 없는 SSR 단계에서는 접근하지 않는다.
- 저장 전 Zod serialize schema를 통과시킨다.
- 읽을 때 schema가 깨졌으면 해당 key만 폐기하고 앱은 정상 시작한다.
- 저장 실패나 quota 오류는 계획 생성을 막지 않고 `STORAGE_UNAVAILABLE` session notice만 표시한다.
- V1 request에는 현재 위치 좌표를 넣지 않는다. 향후 transient origin을 추가할 때도 좌표는 메모리 overlay로만 관리한다.
- `draft`, `lastValidDraft`, live congestion, observed duration, provider 비용은 localStorage에 쓰지 않는다. 이는 기존 architecture의 “실시간 교통정보를 response lifecycle 밖에 cache하지 않는다”는 계약을 그대로 따른다.
- 새로고침 후에는 선택 snapshot과 사용자 설정만 복원하고 phase를 `plan-setup`으로 맞춘 뒤 route를 dirty로 둔다. 사용자가 계획 생성을 누르면 최신 provider 상태로 다시 계산한다.
- 같은 열린 session에서 live traffic이 생성 후 15분을 넘으면 `ROUTE_DATA_STALE`로 표시한다. 이 상태도 저장하지 않는다.
- provider API key, 로그인 token, 원문 전체 응답은 저장하지 않는다.
- migration은 `schemaVersion`별 pure function으로 수행한다.

---

## 17. UI 통합 계약

### 17.1 `SearchExperience`

최종적으로 아래 state를 직접 소유하지 않는다.

- `planPlaces`
- `planActivities`
- `planGenerationRequest`
- `courseConfirmed`
- regional/nearby review state

대신 `usePlanningSession`의 selector와 command를 사용한다. 첫 migration에서는 기존 callback signature를 유지하는 facade를 둬 E2E selector와 동작을 보존한다.

### 17.2 `CourseBuilder`

유지할 동작:

- 사용자가 저장한 항목만 보여준다.
- 포함/제외를 직접 고를 수 있다.
- 시작 장소를 선택할 수 있다.
- 가까운 순서/저장 순서를 선택할 수 있다.
- 지역/주변 검토가 끝나기 전에는 확정하지 않는다.

바꿀 동작:

- 제외한 항목을 즉시 영구 삭제하지 않는다. `includedInCourse=false`로 두고 사용자가 되돌릴 수 있게 한다.
- 확정 결과를 ID 배열과 revision으로 session에 보낸다.
- `38곳 코스 만들기` 같은 잘못된 count는 `included routeable item 수`만 사용한다.

### 17.3 `PlanSetup`

코스 확정 직후 가장 먼저 보이는 영역이다.

- 날짜
- 일정 시작 시각
- 종료 희망 시각
- 여행 속도
- 기본 체류시간
- 각 장소 체류시간 펼침 설정
- 마지막 장소 종료/출발지 복귀
- 계획 생성 버튼

사용자가 버튼을 눌렀을 때 현재 선택 수와 계산 범위를 함께 표시한다.

### 17.4 `PlanBuilder`

최종 책임은 다음뿐이다.

- `TravelPlanV2` 상태 표시
- loading/partial/blocked issue 표시
- 장소별 수정 command 발행
- 실패 leg 재시도
- report/PDF dialog 제어

HTTP 호출, 경로 조립, 일정 계산을 직접 하지 않는다.

generation이 reject되어 phase가 `blocked`가 되면 `lastValidDraft`는 복구용으로만 유지하고 현재 계획처럼 표시하지 않는다. UI가 보여줄 경우 “이전 revision 계획”으로 명확히 분리하며, 현재 revision의 PDF 버튼은 disabled다.

### 17.5 계획서/PDF

- 현재 `.plan-print-header`, `.plan-print-overview`, `.plan-report-table`, `.plan-route-segment` print selector는 migration 동안 유지한다.
- 화면 report와 print report는 같은 `PlanReportViewModel`을 쓴다.
- 인쇄에는 hero, 검색 필터, 결과 목록, drawer backdrop, modal chrome가 포함되지 않는다.
- 첫 페이지 상단에 목적지 수, 날짜, 시작·종료 예상, 총 거리, 알려진 이동시간, 미상 구간 수를 크게 표시한다.
- 본문 표는 순번, 방문지, 도착, 체류, 출발, 다음 이동, 혼잡/확인 상태 순서다.
- 각 이동 구간에는 `출발지 → 도착지`, 출발·도착시각, 거리, 소요시간, live/forecast/직선거리 근거, 지도/내비 링크를 함께 표시한다.
- 좌표가 없어 일정에 못 넣은 선택 항목은 “선택했지만 시간표 미배치” 영역에만 표시한다.
- PDF 버튼을 누를 때 incomplete leg가 있으면 기존 안내 dialog를 보여주고, 현재 내용 저장/재계산을 선택하게 한다.
- print 본문은 최소 11pt, 표 보조문구는 최소 9.5pt를 유지한다. stop 수가 많다고 폰트를 축소하지 않는다.
- route node 2~6개는 A4 1~2페이지를 목표로 하고, 7~12개는 필요한 만큼 페이지를 늘린다. 첫 페이지 요약과 각 movement의 `from → to` 묶음은 page break로 잘리지 않게 한다.

---

## 18. 구현 순서

### Milestone 0 — 문서와 기존 계약 정리

- [ ] `PRD.md`의 exact-only 문구에 supplemental explicit-selection 예외를 링크한다.
- [ ] `ARCHITECTURE.md`에 이 문서를 planning V2 source of truth로 링크한다.
- [ ] 기존 plan 관련 E2E selector와 print CSS 목록을 snapshot으로 기록한다.

완료 기준: 기존 정책과 V2 보조 항목 규칙이 충돌하지 않는다.

### Milestone 1 — 계약과 순수 domain

- [ ] `contracts.ts`, `schemas.ts`, `issues.ts` 생성
- [ ] `MatchEvaluation`, festival, trail, auxiliary, nearby service → `PlanningItemSnapshot` adapter 생성
- [ ] source/admission/role 변환 테스트
- [ ] fingerprint와 stable sort helper 생성
- [ ] `build-schedule` 구현 및 기존 `travel-schedule.ts`는 legacy로 유지
- [ ] report model builder 구현

완료 기준: 외부 API 없이 고정 fixture 입력으로 구조적으로 유효하고 이동시간 미상을 숨기지 않는 partial `TravelPlanV2`를 만든다.

### Milestone 2 — RoutingProvider와 오케스트레이터

- [ ] directions request/response Zod schema 공유
- [ ] `DirectionsApiProvider` 구현
- [ ] `CoordinateOnlyProvider` 구현
- [ ] leg별 fallback, 동시성 3, timeout, AbortSignal 구현
- [ ] generation revision/fingerprint guard 구현
- [ ] atomic commit 테스트

완료 기준: Kakao 성공, key 없음, timeout, 1개 leg 실패가 각각 정의된 결과를 만든다.

### Milestone 3 — Session reducer와 persistence

- [ ] typed command reducer 구현
- [ ] dependency map 구현
- [ ] `usePlanningSession` 구현
- [ ] local repository와 migration 구현
- [ ] hydrate 전 SSR 접근 방지
- [ ] 손상 데이터 복구 테스트

완료 기준: 새로고침 뒤 선택과 조건이 복원되고 provider draft는 재사용되지 않으며, stale 계산은 commit되지 않는다.

### Milestone 4 — UI migration

- [ ] `SearchExperience` callback을 session facade로 교체
- [ ] `nearbyAnchorId`, `startItemId`, `orderedItemIds` 분리
- [ ] `CourseBuilder`의 제외 항목을 reversible state로 변경
- [ ] `PlanSetup` 추가
- [ ] 코스 확정 후 자동 scroll/open/focus 연결
- [ ] `PlanBuilder`를 renderer로 축소

완료 기준: 기존 선택→추가 검토→코스 확정 흐름을 깨지 않고 계획 조건 단계가 명확히 이어진다.

### Milestone 5 — 보고서와 PDF

- [ ] 화면/print 공용 report model 연결
- [ ] 공무원 보고서형 summary와 구간 표 적용
- [ ] partial plan 사전 안내 dialog 연결
- [ ] 2~6 stop A4 1~2페이지, 7~12 stop 가변 페이지와 최소 글꼴/page break 테스트
- [ ] 모바일 중첩 dialog focus/ESC/body lock 회귀 테스트

완료 기준: 인쇄물에 선택하지 않은 UI나 데이터가 없고, 어디로 가며 얼마나 걸리는지 첫 페이지에서 판단 가능하다.

### Milestone 6 — 선택적 자연어 adapter

- [ ] `PlannerLanguageAdapter` interface 추가
- [ ] API 없는 기본값은 `DisabledAdapter`
- [ ] 선택적으로 작은 local rule parser 추가
- [ ] `/api/planner/interpret` OpenAI adapter 추가
- [ ] 반환 command allowlist와 Zod 검증
- [ ] 모델 결과가 숫자·ID·근거를 새로 만들지 못하는 adversarial test

완료 기준: OpenAI 기능을 끄거나 key를 삭제해도 Milestone 1~5 기능이 변하지 않는다.

---

## 19. 파일별 변경표

| 파일 | 변경 |
|---|---|
| `src/domain/plan.ts` | 기존 DTO 유지, deprecated 주석. V2 타입을 여기 넣지 않음 |
| `src/domain/travel-schedule.ts` | 기존 함수 유지. 새 일정은 planning stage에 구현 |
| `src/domain/course.ts` | stable ordering helper 재사용 또는 planning domain으로 이동. 기존 API 호환 유지 |
| `src/features/search/SearchExperience.tsx` | planning session command facade 사용, 세 anchor 의미 분리 |
| `src/features/course/CourseBuilder.tsx` | reversible include, 확정 command, 정확한 count |
| `src/features/planner/PlanBuilder.tsx` | fetch/state 계산 제거, draft renderer로 축소 |
| `src/features/results/FestivalSection.tsx` | 날짜 범위·좌표·source를 평탄화하지 않고 snapshot 전달 |
| `src/features/results/TrailSection.tsx` | 공식 소요시간과 좌표 유무를 구조화해 전달 |
| `src/features/nearby/NearbyCatalog.tsx` | confirmed/unknown을 admission으로 매핑 |
| `src/features/nearby/NearbyServices.tsx` | 서비스 종류와 unverified/not-applicable 상태 보존 |
| `src/app/api/directions/route.ts` | 공유 schema 사용, 현재 status contract 유지 |
| `src/i18n/dictionary.ts` | issue code, setup, report label 번역 추가 |
| `src/app/globals.css` | 새 setup/report 스타일, 기존 print selector 호환 |
| `e2e/course.spec.ts` | session/추가 항목/자동 이동/partial plan 회귀 추가 |
| `e2e/search.spec.ts` | lazy fetch와 review gate 불변식 유지 |

---

## 20. 오류와 축소 동작 표

| code | severity | UI/엔진 동작 |
|---|---|---|
| `INVALID_INPUT` | blocking | 해당 필드로 focus, 생성 안 함 |
| `UNKNOWN_ITEM_ID` | blocking | stale selection 복구 안내 |
| `NO_SELECTED_ITEMS` | blocking | 장소 선택 단계로 이동 |
| `NOT_ENOUGH_ROUTE_NODES` | blocking | 좌표 있는 방문지를 두 곳 이상 포함하도록 안내 |
| `TOO_MANY_ROUTE_NODES` | blocking | 12개 이하로 줄이거나 향후 다일 계획으로 나누도록 안내 |
| `HARD_CONSTRAINT_MISMATCH` | blocking | 해당 core item을 계획에 넣지 않고 검색 조건 재확인 |
| `QUALIFICATION_CONTEXT_MISMATCH` | blocking | 현재 조건에서 다시 확인·저장하거나 이전 조건 항목 제거 |
| `ITEM_WITHOUT_COORDINATES` | warning | 시간표 미배치 목록에 유지 |
| `PET_POLICY_UNVERIFIED` | warning | 코스 유지, 확인 필요 badge와 PDF 체크 항목 |
| `ACTIVITY_OUTSIDE_DATE` | warning | 자동 삭제 금지, 날짜 확인 안내 |
| `OUTSIDE_OPENING_WINDOW` | warning | 자동 삭제 금지, 일정 조정 CTA |
| `ROUTE_PROVIDER_UNAVAILABLE` | warning | 해당 leg coordinate-only |
| `ROUTE_TIMEOUT` | warning | 해당 leg coordinate-only + 재시도 |
| `NO_ROUTE` | warning | 해당 leg coordinate-only + map link |
| `ROUTE_DATA_STALE` | warning | 열린 session의 기존 일정은 보여주되 혼잡 정보를 “다시 확인 필요”로 표시하고 재계산 CTA 제공 |
| `SCHEDULE_UNKNOWN_AFTER_LEG` | warning | 이후 absolute time null |
| `DAY_OVERFLOW` | warning | 초과 항목 표시, 체류/순서 수정 CTA |
| `INTERNAL_PLAN_INVARIANT` | blocking | 새 결과 폐기, 이전 valid draft 유지 |

Session notice는 planning stage issue와 분리한다.

| notice code | UI/session 동작 |
|---|---|
| `STORAGE_UNAVAILABLE` | 현재 in-memory session은 유지하고 저장만 불가 |
| `STALE_GENERATION` | 결과를 조용히 폐기하고 사용자 오류로 노출하지 않음 |
| `GENERATION_ABORTED` | 이전 phase로 복귀, 사용자 취소면 별도 오류 없음 |

error 문장은 domain이나 session에 저장하지 않는다. `code + params`를 dictionary에서 번역한다.

---

## 21. 테스트 명세

### 21.1 Unit

- 모든 schema의 정상/경계/실패 parse
- 잘못된 날짜, 시간, 좌표, dwell, budget 거부
- duplicate item ID와 unknown ordered ID 거부
- 서로 다른 search query/pet profile fingerprint의 core item 혼합 거부
- 축제와 nearby가 exact/confirmed로 승격되지 않음
- 동일 좌표 거리 동률에서 안정 정렬
- 첫 장소와 마지막 장소 dwell 반영
- 장소별 dwell override 우선순위
- null route duration 이후 시각 null cascade
- `dayEndTime` 초과 탐지
- 축제 날짜 범위 불일치 탐지
- `TZ=UTC`와 `TZ=America/Los_Angeles`에서 동일한 KST schedule/forecast provider 값
- coordinate-only duration이 항상 null
- 비용 0과 unknown 구분
- 선택하지 않은 비용 미합산
- command별 revision 증가와 dirty stage 계산
- 추천 후보가 현재 일정 duration을 덮어쓰지 않고, 적용 command 뒤에만 startTime이 바뀜
- session lifecycle event의 phase guard와 review 무효화
- storage 손상/구버전/SSR/용량 실패
- persistence serializer가 route/congestion/report를 저장하지 않음
- 열린 session에서 15분 지난 live traffic을 stale로 표시하고, 새로고침 후에는 traffic을 복원하지 않음

### 21.2 Orchestrator integration

1. 모든 provider 성공
2. Kakao key 없음
3. 전체 timeout
4. 가운데 leg 한 개만 실패
5. 이전 generate가 늦게 완료되는 race
6. 생성 중 reorder command
7. 좌표 없는 trail 포함
8. 여행일 밖 festival 포함
9. supplemental unverified 포함
10. return-to-start closing leg
11. rejected generation이 last valid draft를 현재 revision으로 표시하거나 인쇄하지 않음
12. base live congestion + future summary 병합 시 서로 다른 basis 보존

각 테스트는 다음 invariant를 공통 검사한다.

- output ID ⊆ `includedItemIds` ⊆ input item ID
- unknown route time은 추정값으로 채워지지 않음
- qualification과 pet admission status는 상승하지 않음
- invalid 새 draft가 last valid draft를 덮지 않음

### 21.3 E2E

- fixture mode, API key 0개로 장소 2개 선택 → 추가 검토 → 코스 → plan setup → partial 계획 → print preview
- mock road success로 정확한 도착·출발시각과 traffic basis 확인
- 지역 축제 1개와 주변 병원 1개 선택 후 둘 다 코스/보고서에 반영
- 좌표 없는 산책로가 “미배치 선택 항목”에 보존
- 날짜/체류시간 수정 후 새 revision만 화면에 반영
- pet size/hard 조건 변경 후 이전 query에서 저장한 core item은 재확인 전 코스 확정 불가
- 새로고침 후 선택·조건 복원, 경로는 미복원 및 재생성
- 390px drawer 안 PDF dialog focus trap, Escape 한 번에 내부 dialog만 닫힘, body scroll lock 해제
- print media에 hero/filter/results/modal 미노출
- 선택하지 않은 장소가 PDF에 한 건도 없음
- PDF의 movement 수와 `TravelPlanV2.legs` 수가 같고 각 구간의 출발지·도착지·근거가 표시됨
- 지역/주변 panel은 펼치기 전 API 0회, 재열기 추가 API 0회

### 21.4 필수 실행 명령

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

개발 중에는 영향 범위 테스트를 먼저 실행하되, merge 전에는 `npm run check`와 관련 E2E를 모두 실행한다.

---

## 22. 선택적 OpenAI 연동

OpenAI는 계획 엔진이 아니라 **command 번역기**다.

```ts
interface PlannerLanguageAdapter {
  interpret(input: {
    message: string;
    revision: number;
    allowedItemIds: string[];
    currentSettings: PlanningRequestV1["settings"];
  }, signal: AbortSignal): Promise<PlannerCommand[]>;
}
```

허용 예:

- “출발을 10시로 바꿔줘” → `SET_START_TIME`
- “두 번째 장소는 60분만” → ID를 기존 순서에서 해석한 `SET_ITEM_DWELL`
- “축제를 마지막으로 옮겨줘” → 기존 ID만 사용한 `REORDER_ITEMS`

금지 예:

- 모델이 새로운 장소 ID를 생성
- 확인되지 않은 식당을 동반 가능으로 변경
- 임의 이동시간·입장료 생성
- hard 조건 완화

향후 API 계약:

```json
POST /api/planner/interpret
{
  "planId": "plan-123",
  "revision": 4,
  "message": "두 번째 장소는 한 시간만 머물러",
  "allowedItemIds": ["a", "b", "c"],
  "settings": { "startTime": "09:00", "defaultDwellMinutes": 90 }
}
```

```json
{
  "success": true,
  "data": {
    "commands": [{ "type": "SET_ITEM_DWELL", "itemId": "b", "minutes": 60 }],
    "explanationCode": "COMMANDS_READY"
  },
  "error": null
}
```

서버는 command Zod schema, allowed item ID, revision을 다시 검증한다. 첫 구현에서는 이 route 자체를 만들지 않아도 된다.

---

## 23. 성능 기준

- route 제외 순수 planning stage: route node 12개에서 합계 50ms 이하 목표
- route provider 동시성: 최대 3
- interactive 1일 계획 권장 stop: 2~8개
- hard limit: 12 route nodes. 초과 시 조용히 자르지 않고 분할/제외 안내
- 기존 server timeout 5초, client timeout 7초 유지
- 재열기/다시 render로 동일 route 요청 금지
- revision 변경으로 필요 없는 stage 재호출 금지
- OpenAI adapter 도입 시 사용자 command 1회당 모델 호출 최대 1회

---

## 24. 보안과 개인정보

- provider와 OpenAI API key는 server environment에만 둔다.
- exact current location은 사용자 동작 후에만 얻고 기본적으로 저장하지 않는다.
- localStorage에는 선택 snapshot과 사용자 설정만 저장한다. 경로, 혼잡, provider 비용, 계산 report는 저장하지 않는다.
- provider raw response 전체를 브라우저에 저장하지 않는다.
- source evidence는 표시와 감사에 필요한 최소 문자열만 보존한다.
- 로그에는 현재 위치 좌표, API key, 로그인 token을 남기지 않는다.
- 자연어 API에는 전체 카탈로그를 보내지 않고 현재 계획의 allowlisted ID와 최소 label만 보낸다.

---

## 25. 기능 플래그와 migration

초기 통합은 `NEXT_PUBLIC_PLANNER_V2=1`에서만 활성화한다.

1. flag off: 현재 `PlanBuilder` 흐름 유지
2. flag on: DTO adapter → planning session → V2 orchestrator 사용
3. E2E와 실제 QA가 통과하면 default on
4. 한 릴리스 동안 legacy `PlanBuilder` 계산 코드를 유지
5. 이후 legacy 생성 코드와 dead `PlanItinerary`/`TravelPlan` 타입 제거

기존 localStorage plan 데이터는 없으므로 데이터 migration은 V2부터 시작한다. 구현 이후 schema 변경은 반드시 `migrations.ts`를 거친다.

---

## 26. 예시 입력과 결과

### 26.1 입력 요약

```json
{
  "schemaVersion": 1,
  "planId": "plan-demo",
  "revision": 3,
  "locale": "ko",
  "timeZone": "Asia/Seoul",
  "region": "대전광역시",
  "qualificationContext": {
    "queryFingerprint": "sha256:demo-query",
    "dataSnapshotId": "tour-snapshot-2026-08-15",
    "matchRuleVersion": "rules-v1",
    "petProfileRevision": 2,
    "hardConstraintKeys": ["smallDog"],
    "preferenceKeys": [],
    "categoryKeys": ["attraction"],
    "preparationFilterKeys": [],
    "petProfile": {
      "size": "smallDog",
      "weightKg": 8.5,
      "dangerousDog": false
    }
  },
  "includedItemIds": ["place:a", "festival:b", "nearby-service:veterinary:c"],
  "orderedItemIds": ["place:a", "festival:b", "nearby-service:veterinary:c"],
  "nearbyAnchorId": "place:a",
  "startItemId": "place:a",
  "endPolicy": "last-item",
  "settings": {
    "tripDate": "2026-08-20",
    "startTime": "09:00",
    "dayEndTime": "20:00",
    "transportMode": "car",
    "pace": "balanced",
    "orderMode": "manual",
    "defaultDwellMinutes": 90,
    "defaultDwellSource": "preset",
    "budgetKrw": null,
    "includeTollsInBudget": false
  }
}
```

`selectedItems`에는 위 세 ID의 snapshot이 모두 있어야 하며 여기서는 길이 때문에 생략했다.

### 26.2 provider 일부 실패 결과 요약

```json
{
  "schemaVersion": 2,
  "id": "plan-demo",
  "revision": 3,
  "status": "partial",
  "departureRecommendation": {
    "legId": "place:a->festival:b",
    "currentDepartureAt": "2026-08-20T10:30+09:00",
    "currentDurationMinutes": 17,
    "recommendedDepartureAt": "2026-08-20T11:30+09:00",
    "recommendedDurationMinutes": 14,
    "comparisonCount": 3,
    "isAlreadyApplied": false
  },
  "scheduledItems": [
    {
      "itemId": "place:a",
      "sequence": 1,
      "startsAt": "2026-08-20T09:00+09:00",
      "endsAt": "2026-08-20T10:30+09:00"
    },
    {
      "itemId": "festival:b",
      "sequence": 2,
      "startsAt": "2026-08-20T10:47+09:00",
      "endsAt": "2026-08-20T12:17+09:00"
    },
    {
      "itemId": "nearby-service:veterinary:c",
      "sequence": 3,
      "startsAt": null,
      "endsAt": null
    }
  ],
  "legs": [
    {
      "fromItemId": "place:a",
      "toItemId": "festival:b",
      "basis": "provider-road",
      "distanceKm": 7.2,
      "durationMinutes": 17,
      "durationBasis": "forecast",
      "trafficDetailsBasis": "live",
      "forecastDepartureAt": "2026-08-20T10:30+09:00"
    },
    {
      "fromItemId": "festival:b",
      "toItemId": "nearby-service:veterinary:c",
      "basis": "coordinate-only",
      "distanceKm": 1.8,
      "durationMinutes": null,
      "durationBasis": "unknown",
      "trafficDetailsBasis": "unavailable",
      "forecastDepartureAt": null
    }
  ],
  "issues": [
    {
      "code": "PET_POLICY_UNVERIFIED",
      "severity": "warning",
      "itemId": "festival:b"
    },
    {
      "code": "ROUTE_TIMEOUT",
      "severity": "warning",
      "legId": "festival:b->nearby-service:veterinary:c"
    },
    {
      "code": "SCHEDULE_UNKNOWN_AFTER_LEG",
      "severity": "warning",
      "legId": "festival:b->nearby-service:veterinary:c"
    }
  ]
}
```

이 결과에서 병원 도착시각을 임의로 계산하지 않는 것이 정상이다. PDF에는 첫 구간의 확정 시간과 두 번째 구간의 직선거리/시간 미상을 함께 보여준다. `11:30` 추천은 아직 advisory이므로 현재 일정은 실제 `10:30` 출발 후보의 17분을 사용한다. 사용자가 추천 적용 command를 실행하기 전에는 14분을 현재 일정에 쓰지 않는다.

---

## 27. Definition of Done

아래 조건을 모두 만족해야 로컬 계획 V2 구현이 끝난 것으로 본다.

1. `OPENAI_API_KEY`, `KAKAO_REST_API_KEY`, live Tourism key가 없어도 fixture mode에서 partial 계획 생성, 수정, 선택·조건 복원, 인쇄가 된다. 도로 이동시간과 혼잡은 명시적으로 미상이다.
2. 입력에 없는 장소, 활동, 가격, 이동시간이 결과에 생기지 않는다.
3. coordinate-only leg는 항상 이동시간 null과 불확실성 안내를 가진다.
4. core 검색 snapshot과 supplemental verification 상태가 분리되어 있다.
5. 축제, 산책로, 주변 시설을 선택해도 그 사실이 `exact`로 승격되지 않는다.
6. route 가능한 선택 항목은 코스와 혼잡 계산에 반영되고, 좌표 없는 항목은 이유와 함께 보존된다.
7. 같은 입력과 같은 provider 결과는 stable metadata를 제외하고 같은 plan을 만든다.
8. 실패한 stage가 이전 valid draft를 훼손하지 않는다.
9. command는 revision을 증가시키고 영향받는 단계만 다시 실행한다.
10. 오래된 비동기 응답이 최신 계획을 덮지 않는다.
11. localStorage 데이터는 schemaVersion으로 검증되며 손상 데이터로 앱이 중단되지 않는다.
12. 계획서 첫 페이지에서 방문 순서, 도착·출발, 체류, 이동거리·시간, 미상 구간을 한눈에 확인할 수 있다.
13. PDF에는 사용자가 최종 포함 확정한 항목과 그 항목에서 계산된 계획 정보만 들어간다.
14. 모바일 중첩 dialog의 focus, Escape, scroll lock이 정상이다.
15. 기존 검색, pagination, 추가 선택 lazy loading, review gate가 회귀하지 않는다.
16. OpenAI adapter를 추가하더라도 모델은 allowlisted command만 반환할 수 있다.
17. 추천 출발 후보의 시간이 사용자가 적용하기 전 현재 일정 duration에 섞이지 않는다.
18. localStorage에는 live route, congestion, provider 비용, report가 저장되지 않는다.
19. blocked revision은 이전 valid draft를 현재 PDF로 인쇄할 수 없다.
20. included core item은 모두 현재 search query와 pet profile fingerprint에서 검증된 snapshot이다.

---

## 28. 구현 시작 시 첫 작업 묶음

다음 작업은 추가 설계 질문 없이 바로 시작할 수 있는 최소 단위다.

1. `src/domain/planning/contracts.ts`, `schemas.ts`, `issues.ts`를 만든다.
2. 이 문서 11장의 계약을 Zod discriminated union으로 옮긴다.
3. `planning-item-adapter.ts`에서 proof를 가진 `MatchEvaluation`과 festival/trail/auxiliary/nearby source DTO를 snapshot으로 변환한다. `PlanPlace`/`PlanActivity` legacy adapter는 migration fallback으로만 둔다.
4. festival과 nearby가 `confirmed`로 승격되지 않는 unit test를 먼저 작성한다.
5. API 호출 없는 `normalize-selection`, `build-schedule`, `build-report`를 구현한다.
6. 고정 fixture 3개로 `TravelPlanV2.status === "partial"` snapshot test를 만든다.
7. 이후 shared directions schema와 RoutingProvider를 붙인다.

이 순서라면 OpenAI 키나 새 외부 API를 기다리지 않고 즉시 로컬 구현과 검증을 시작할 수 있다.

---

## 29. 구현 전 추가 확인이 필요 없는 기본 결정

- 첫 배포와 `TravelPlanV2`는 1일 계획이다. 다일 계획은 별도 schema version으로 추가한다.
- 경로에 들어가는 방문지는 최소 2개, 최대 12개다.
- 출발지는 저장한 방문지 중 하나이며 첫 배포에서는 집/현재 위치 구간을 계산하지 않는다.
- 검색 core와 supplemental item을 분리하되, 사용자가 검토 후 포함한 route 가능한 supplemental item은 실제 구간 계산에 넣는다.
- 도로 provider 실패 시 이동시간을 추정하지 않는다.
- 기본 여행 속도는 `balanced`, 기본 체류는 90분이다.
- 첫 이동의 출발 후보만 `-60/0/+60분`으로 비교한다.
- 저장소는 브라우저 localStorage이고 서버 DB 저장은 후속 범위다.
- 예산 UI는 선택 기능이며 알 수 없는 비용을 0으로 처리하지 않는다.
- OpenAI 연동은 Milestone 1~5 완료 후 선택적으로 진행한다.
- 기존 디자인 selector와 print CSS는 migration 동안 호환한다.
- 기능 flag가 켜진 경로에서 먼저 검증한 뒤 legacy 계산 코드를 제거한다.

위 결정을 변경하라는 새 요구가 없다면 구현자는 별도 설계 질문 없이 Milestone 1부터 착수한다.
