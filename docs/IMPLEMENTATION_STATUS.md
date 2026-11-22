# FlowForge v0.6.0 — 구현 현황과 확인 사항

이 파일은 **전체 확정 요구사항**(`FlowForge_FULL_REQUIREMENTS.md`)과 달리 실제 이번 배포의 상태를 보고한다. 완료라고 표시한 항목도 실제 VSCode Extension Host에서 검증된 것은 아니다.

## 구현한 기능 (코드 및 Node 기반 확인)

- **Phase 0:** 레거시 v1 → v2 데이터 메모리 변환, 승인 후 원본 백업·v2 저장, `nodes/edges/layout` 분리, 자료형·포트·참조 검증.
- **Phase 1:** 22px 정수 격자, 노드 이동·크기 조절, 겹침 거부, 팔레트/빠른 생성/연결선 + 삽입, 스마트 Flow/Data 포트, 직각 경로 탐색, 수동 경유점 추가 및 드래그.
- **Phase 2:** 사각형 영역 선택, Ctrl+A/C/V/D, 다중 이동, 내부 연결만 복사, 그룹 생성·접기/펼치기 표시 및 그룹 멤버 이동, 하위 파일 생성·열기, 영속 Undo JSON 저장/복구.
- **Phase 3:** 외부 파일 감시, 저장 상태 자동 새로고침, 편집 중 Diff 안내, 노드/연결/배치 기준 3-way 병합 선택, 저장 전 충돌 확인, 임시 파일 교체.
- **Phase 4:** 수동 구조·참조·자료형 검사, Problems 진단 출력, 안전한 표현식 평가기와 단계/되돌리기/연속 실행, 브레이크포인트/Step Over, Data 값 전달, 하위 차트 진입·복귀 시뮬레이션. Rust CLI 기본 검증 소스 및 선택적 호출 연동.
- **Phase 5:** 코드 범위 연결 명령, 속성 패널에서 소스 연결/옆 편집기 열기, 함수 심볼 우선 탐색과 범위 fallback, 저장된 소스의 변경/누락 상태 표시.
- 다크 테마, 접기 가능한 패널, 작은 편집기에서 자동 숨김, 포트 호버 표시.

## 알려진 미완성/제한 (출시 전 후속 구현/검증 필요)

- 하위 차트의 기본 진입/복귀, Data 간선 값 전파와 미초기화 상태는 구현했지만, **모든 하위 파일 상대경로·재귀/범위 변수 격리·복잡한 데이터 흐름**에 대한 테스트는 부족하다.
- 그룹 접기/펼치기와 그룹 단위 이동을 구현했지만, **그룹 복사/붙여넣기·연결선 시각화의 모든 예외·그룹 속성 편집**은 미완성.
- Visual Diff는 노드/간선 변경 목록과 충돌별 선택을 지원하지만, **그룹/변수/소스 binding 등 모든 필드에 대한 완전 3-way merge는 미구현**.
- 연결선 자동 경로가 복잡한 차트에서 제한 횟수 내에 실패할 경우 직각 fallback이 **다른 블록을 통과할 수 있음**.
- JavaScript 검증을 기본 사용하고, Rust 바이너리가 있으면 별도로 호출해 검사 결과를 추가한다. 다만 Rust는 **기본 검증 일부만 구현되어 있고 경로·시뮬레이터의 주 계산은 JavaScript에서 수행**한다.
- 브레이크포인트와 Step Into/Over 기초 기능은 구현. **Watch 입력/변수 편집 UI, 미니맵, 포트 위치 수동 재배치, Ghost 미리보기, 복잡한 경로 조절 UI**는 미완성.
- VSCode 설치·UI 조작 통합 테스트, Windows에서 VSIX 설치/업데이트 테스트, Rust `cargo` 빌드 확인은 이 환경에서 수행하지 못했다.
- 웹뷰 키 조작과 호스트 운영체제/VSCode 단축키 충돌 등 현장 사용성 확인 필요.

## 확인한 테스트

- `node --check` : `extension.js`, `media/model.js`, `media/editor.js`, `core/model.js` 문법 검사
- `node test/model.test.js`: 스키마/참조, 기본 시뮬레이터, v1 변환, 독립적 변경 병합/충돌, 경고 검사.
- `node test/simulation.test.js`: 하위 차트 진입/복귀 및 Data 포트 값 전파.
- `python test/ui_smoke.py`: Chromium에서 노드/연결선 렌더링, 수동 검증 요청, 시뮬레이터 패널, 선택 및 블록 복제. (VSCode Webview의 실제 호스트 통신은 별도 검증 필요)
- VSIX 구조 ZIP 파일 검증.

## 배포 주의

- Rust 바이너리는 포함하지 않았으며, `rust/`는 Rust 코어 소스이다. Rust가 설치된 컴퓨터에서는 `cd rust && cargo build --release`로 컴파일할 수 있다.
- VSCode 확장은 Node 기반 UI/검증을 사용할 수 있지만, Rust 코어 자동 호출은 후속 작업이다.
- 실제 중요 설계 파일에 사용하기 전에 예제 파일을 별도로 백업하고 새 작업폴더에서 먼저 시험하기.


## v0.7.3 — Connection port interaction
- Output ports are the only valid drag origins.
- Starting a connection exposes all block ports, including ports on non-hovered blocks.
- Compatible input ports are highlighted green; incompatible targets are muted.
- Compatibility checks enforce direction, Flow/Data kind, and Data type.
- Port hit targets are larger than the visible dots to make connecting easier.
- Existing block-hover/selection port visibility remains unchanged outside connection mode.

## v0.7.4 — Connection diagnostics
- Connection validation now returns a human-readable failure reason instead of a boolean only.
- Reasons cover missing source/target port, same-node connection, invalid input/output direction, Flow/Data mismatch, Data type mismatch, and duplicate connections.
- Invalid hovered targets show the reason while dragging; dropping on a non-port explains that an input port is required.
- Successful connection creation confirms completion.
- Automated syntax, model, simulator, feature, port UX, and diagnostics tests pass.

## v0.8.2 — Unified settings storage
- All FlowForge user preferences are stored in one `settings.json` under VSCode extension `globalStorageUri`.
- Theme, grid mode/style, panel open/closed states, editor preferences, shortcut preferences, and recent files share one versioned JSON structure.
- Writes use a temporary file followed by rename.
- Existing VSCode theme/grid settings and GlobalState recent-file list are migrated on first run.
- Existing Webview panel localStorage values are migrated to the unified settings file when the editor initializes; new panel changes are written centrally.
- Removed contributed VSCode theme/grid settings as active sources of truth; rustBinary remains an extension runtime configuration.
- Node syntax and 10 automated test files passed. Real Windows VSCode migration/extension-host validation remains required.
