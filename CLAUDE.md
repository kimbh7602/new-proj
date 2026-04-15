## AI Agent 워크플로우

### 핵심 원칙

1. **결과 보고 필수** — 작업 완료 시 무엇을 했고 완료되었는지 반드시 명확히 전달.
2. **TDD** — 테스트 환경 구축 시 적용. 테스트 프레임워크가 설정되면 테스트 먼저 작성 → 구현 → 통과 확인.
3. **단계별 승인 최소화** — 각 단계의 시작과 끝에서만 상태 보고. 중간 과정에서 매번 묻지 말 것.

### 워크플로우

#### 빠른 작업 (기본 — 대부분의 요청)

사용자 지시가 명확한 소규모 작업. 별도 기획/리뷰 프로세스 없이 진행.

```
사용자 지시 → 구현 → 피드백 반영 → 완료
```

- 중간 확인 없이 바로 진행
- 완료 시 결과 보고

#### 대규모 기능 구현 (사용자가 명시적으로 요청할 때)

새로운 기능, 아키텍처 변경 등 범위가 큰 작업.

```
1. Phase A: 의사결정 (사용자 참여)
   - /office-hours: 아이디어 구체화, 문제 정의
   - /plan-ceo-review: 범위, 방향성 검증
   - 사용자 최종 승인 후 "이후 자율 진행" 고지

2. Phase B: 자율 실행 (동의없이 진행)
   - /design-consultation → /plan-eng-review → 구현
   - /simplify → /qa → /cso → /review

3. PR 생성
   - /ship 으로 PR 생성
   - 최종 결과 보고
```

#### 버그 수정

```
/investigate → 수정 → /qa → /review → PR
```

#### 디자인 개선

```
/design-review → 수정 → /qa → PR
```

### gstack Skills 레퍼런스

#### 핵심 (거의 매번 사용)

| Skill | 역할 |
|-------|------|
| `/investigate` | 버그 디버깅, 근본 원인 분석 |
| `/review` | PR diff 분석, 구조적 이슈 체크 |
| `/ship` | PR 생성 |
| `/simplify` | 변경된 코드의 재사용성, 효율성, 품질 검토 + 자동 수정 |

#### 상황별 (필요할 때)

| Skill | 언제 |
|-------|------|
| `/qa` | QA 테스트 + 버그 자동 수정이 필요할 때 |
| `/browse` | 브라우저 테스트가 필요할 때 |
| `/design-review` | 라이브 사이트 비주얼 QA |
| `/cso` | 보안 점검 (OWASP Top 10, STRIDE, 의존성 검사) |
| `/codex` | 세컨드 오피니언 (코드 리뷰, 챌린지) |

#### 대규모 기능 전용 (풀 프로세스 시에만)

| Skill | 역할 |
|-------|------|
| `/office-hours` | 아이디어 구체화, 문제 정의, 타겟 사용자 분석 |
| `/plan-ceo-review` | 범위, 방향성 검증 |
| `/autoplan` | CEO + 디자인 + 엔지니어링 리뷰 자동 실행 |
| `/design-consultation` | 디자인 시스템 생성 (DESIGN.md) |
| `/plan-eng-review` | 아키텍처, 엣지케이스, 테스트 커버리지 |

#### 기타

`/loop` (반복 실행) · `/schedule` (cron 스케줄링) · `/canary` (카나리 모니터링) · `/land-and-deploy` (머지 & 배포) · `/benchmark` (성능 벤치마크) · `/retro` (주간 회고) · `/careful` · `/freeze` · `/guard` · `/unfreeze` (안전 모드) · `/setup-browser-cookies` (쿠키 임포트) · `/document-release` (문서 업데이트)

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
