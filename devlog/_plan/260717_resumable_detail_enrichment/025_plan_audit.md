- Trigger: 백업 직후 무결성 검사가 실행·기록되지 않음. Impact: 손상되거나 불완전한 백업으로 라이브 동기화를 시작할 수 있음. Path: `devlog/_plan/260717_resumable_detail_enrichment/020_live_enrichment.md:3`, `scripts/backup-db.ts:12`. Remediation: 원본과 백업 각각 `PRAGMA quick_check` 또는 `integrity_check`가 `ok`인지 확인하고, 실패 시 동기화를 중단하도록 명시·자동화.

- Trigger: 라이브 호출 한도와 단일 배치가 환경변수로 0–900건 및 1–20배치까지 재정의 가능하지만 계획에 고정된 실행 명령이나 사전 검증이 없음. Impact: 오래된 `.env.local` 값으로 800건 예산 또는 invocation당 한 배치 제한을 초과할 수 있음. Path: `devlog/_plan/260717_resumable_detail_enrichment/020_live_enrichment.md:4`, `scripts/sync-tour-db.ts:18`, `scripts/sync-tour-db.ts:19`. Remediation: Phase 2 실행 명령에서 `TOUR_API_DETAIL_LIMIT=800`과 `TOUR_API_SYNC_BATCHES=1`을 명시하고 실행 전 유효 설정을 비밀 없이 출력·검증.

- Trigger: 할당량 오류나 동기화 실패 이후 활성 스냅샷 보존 여부를 검증하는 절차가 없음. Impact: 실패 시 이전 성공 스냅샷이 실제로 유지됐는지, 재실행 가능한지 증명할 수 없음. Path: `devlog/_plan/260717_resumable_detail_enrichment/020_live_enrichment.md:6`, `scripts/sync-tour-db.ts:41`. Remediation: 실행 전 snapshot/run 식별자와 집계를 기록하고, 실패 후 동일 식별자·집계 및 SQLite 무결성을 재확인한 뒤 재개 조건과 백업 복원 절차를 명시.

- Trigger: “aggregate counts only” 요구와 달리 CLI가 데이터베이스 경로와 전체 결과 객체를 그대로 출력함. Impact: 수집 산출물이 집계 전용이라는 증거가 없고 `lastSync` 구조 변경 시 비집계 데이터가 노출될 수 있음. Path: `devlog/_plan/260717_resumable_detail_enrichment/020_live_enrichment.md:5`, `scripts/sync-tour-db.ts:35`. Remediation: 허용된 집계 필드만 명시적으로 투영한 증거 출력을 사용하고 `...result` 및 경로 출력을 제거하거나 별도 비수집 채널로 분리.

- Trigger: API/UI 검증이 구체적인 엔드포인트, 필터 입력, 기대 집계, 최신 snapshot 식별자 없이 서술되어 있음. Impact: 애플리케이션이 최신 DB를 사용했는지와 dog-size 필터 결과가 정확한지 재현·판정할 수 없음. Path: `devlog/_plan/260717_resumable_detail_enrichment/020_live_enrichment.md:7`. Remediation: DB 모드 실행 환경, places API 요청과 기대 집계, 각 dog-size UI 검증 사례, 최신 snapshot과의 대조 및 통과 기준을 명시.

- Trigger: 앱/라이브 검증 프로세스 종료와 임시 환경 정리 절차가 없음. Impact: 개발 서버가 남아 후속 실행의 포트·환경·DB 상태를 오염시킬 수 있음. Path: `devlog/_plan/260717_resumable_detail_enrichment/020_live_enrichment.md:7`, `package.json:16`. Remediation: PID 또는 세션을 기록하고 성공·실패 모두에서 종료를 확인하며, 임시 설정을 복구하고 백업 및 증거 산출물만 보존하는 teardown 단계를 추가.

VERDICT: GO-WITH-FIXES (blockers=6)