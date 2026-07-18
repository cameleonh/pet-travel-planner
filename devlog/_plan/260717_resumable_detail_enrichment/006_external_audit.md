- Trigger: 상세 API가 HTTP 429 또는 결과 코드 22로 할당량 소진을 반환함.  
  Impact: 오류를 행 단위 실패로 삼아 남은 워커가 계속 요청하고, 완성되지 않은 스냅샷을 게시해 다수 행을 `failed`로 변경할 수 있음.  
  Path: `src/data/providers/tour-api-provider.ts:141`, `src/data/providers/tour-api-provider.ts:144`, `src/data/providers/tour-api-provider.ts:198`  
  Remediation: 할당량 오류를 치명적 provider 오류로 분류하고 신규 작업 배정을 즉시 중단한 뒤 `getSnapshot()`을 실패시켜 기존 체크포인트를 유지해야 함.

- Trigger: 기존 `fetched` 행의 `modifiedtime`이 변경됐지만 상세 예산 밖에 있거나 상세 요청이 실패함.  
  Impact: 검증된 정책·편의시설·관측 시각이 placeholder/빈 값으로 소실되고, 새 수정 토큰이 저장되어 이후 refresh 대상에서도 제외됨. 계획의 증거 보존 및 재시도 가능성 계약을 위반함.  
  Path: `src/data/providers/tour-api-provider.ts:209`, `src/data/providers/tour-api-provider.ts:212`, `src/data/providers/tour-api-provider.ts:227`, `src/data/providers/tour-api-provider.ts:231`, `src/data/providers/tour-api-provider.ts:232`  
  Remediation: refresh 성공 전까지 cached policy, amenities, observed time, `fetched` 상태 및 이전 수정 토큰을 보존해야 함. 신규/미확보 행의 실패만 `failed`로 전환해야 함.

- Trigger: 카탈로그 앞부분에 과거 실패 행이 있고 뒤에 미시도 행이 존재함.  
  Impact: 대상이 단순 카탈로그 순서로 잘리므로 실패 행이 매 실행마다 예산을 선점하여 카탈로그 후반부가 영구적으로 굶을 수 있음.  
  Path: `src/data/providers/tour-api-provider.ts:182`  
  Remediation: 변경된 fetched → pending/not-fetched → failed 순으로 안정 정렬한 뒤 제한을 적용하고, 출력 자체는 원래 카탈로그 순서를 유지해야 함.

- Trigger: 한 번의 실행에서 여러 제한 배치를 진행하거나, 배치가 성공적으로 게시됐지만 fetched coverage가 증가하지 않음.  
  Impact: CLI가 단일 provider/sync 호출만 수행하며 최신 스냅샷을 다음 배치의 캐시로 재사용하지 않음. 따라서 계획된 다중 배치 진행, 무진행 중단, stop reason 및 pending/failed 보고 계약이 구현되지 않아 완전한 재시작 가능 enrichment 흐름을 실행할 수 없음.  
  Path: `scripts/sync-tour-db.ts:16`, `scripts/sync-tour-db.ts:26`, `scripts/sync-tour-db.ts:29`  
  Remediation: 배치마다 최신 스냅샷을 다시 로드해 provider를 생성·동기화하고 coverage를 비교하는 제한된 orchestration loop를 추가해야 함. 완료·무진행·배치 한도·상류 오류를 중단 사유로 기록하고 before/after coverage, pending/failed, completed batches를 출력해야 함.

VERDICT: GO-WITH-FIXES (blockers=4)