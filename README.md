# FlowForge — 시각적 로직 설계 도구

FlowForge는 VS Code에서 프로그램의 흐름과 데이터 관계를 블록과 연결선으로 설계하고 관리하는 시각적 로직 편집기입니다. 차트는 편집 가능한 `.flow.json` 파일로 저장되며, 사람이 읽고 AI가 분석하기 쉬운 구조를 지향합니다. **AI 채팅 기능은 내장하지 않습니다.**

> 기준 소스 버전: **v0.8.2**. 이 저장소는 개발 중인 스냅샷이며, 계획된 모든 요구사항이 구현·검증 완료되었다는 의미는 아닙니다.

## 주요 기능

- 22px 격자 기반 캔버스와 블록 배치
- Flow/Data 포트 및 방향·자료형 검사
- 직각 연결선, 수동 꺾임점 편집 및 잠금
- 블록 선택·그룹·복사와 Undo/Redo 관련 기능
- 수동 로직 검증 및 변수 기반 시뮬레이션 기능
- 테마·격자·패널·최근 파일 설정을 통합한 버전 관리형 `settings.json`
- 사이드바의 **새 차트 만들기**, **기존 차트 열기**, **최근 차트 열기**
- `AGENTS.md`와 요구사항 문서를 통한 AI 개발 규칙 및 추적성

기능별 실제 구현 범위와 제한은 [구현 상태 문서](docs/IMPLEMENTATION_STATUS.md)를 확인하세요.

## 마우스 조작 정책

- **빈 캔버스 좌클릭 드래그:** 캔버스 이동
- **우클릭 드래그:** 블록 및 교차하는 연결선 범위 선택
- **드래그하지 않은 우클릭:** 문맥 메뉴 열기
- **블록 좌클릭 드래그:** 블록 이동
- **Ctrl+A:** 블록과 연결선 전체 선택
- **Space:** FlowForge 기능을 할당하지 않음

## 저장소 구성

```text
.
├── AGENTS.md
├── REQUIREMENTS/
│   └── MASTER.md
├── core/
├── docs/
├── examples/
├── media/
├── rust/
├── test/
└── package.json
```

## 개발 및 테스트

필요 환경:
- VS Code 확장 개발 환경
- Node.js (확장 및 JavaScript 테스트)
- Python (일부 UI/통합 테스트)
- Rust toolchain (Rust 구성 요소 빌드 시)

주요 검사 명령:

```sh
node --check extension.js
node --check media/editor.js
node test/model.test.js
node test/simulation.test.js
cd rust && cargo test
```

관련 문서:
- [AI 개발 규칙](AGENTS.md)
- [통합 요구사항](REQUIREMENTS/MASTER.md)
- [AI 작업 흐름](docs/AI_WORKFLOW.md)
- [구현 상태 및 알려진 제한](docs/IMPLEMENTATION_STATUS.md)
- [전체 요구사항 상세](docs/FlowForge_FULL_REQUIREMENTS.md)

## 설치

이 저장소 스냅샷에는 VSIX 설치 패키지가 포함되어 있지 않습니다. VS Code 확장 패키징 도구를 사용해 별도로 패키징하세요. 실제 Windows VS Code Extension Host에서 검증하지 않았다면 실환경 검증 완료로 간주하지 않습니다.

## 개발 기여 및 변경 정책

1. 코드를 수정하기 전에 관련 요구사항 ID를 확인합니다. 매번 전체 프로젝트를 다시 읽지 않습니다.
2. 기존 사용자 변경사항을 보존하고 `git diff`를 확인합니다.
3. 최소 범위로 수정하고 관련 테스트를 추가하거나 갱신합니다.
4. 테스트 결과는 **통과**, **실패**, **미검증**으로 구분합니다. 실행하지 않은 테스트를 통과했다고 보고하지 않습니다.
5. 동작이나 범위가 바뀌면 요구사항 및 구현 상태 문서를 갱신합니다.
6. 커밋 전 Diff를 제시하고 명시적인 승인을 받습니다. Push도 별도 승인이 필요합니다.

## 라이선스

현재 라이선스가 지정되지 않았습니다. 라이선스 파일이 추가되기 전까지 저작권은 기본적으로 권리자에게 유보됩니다.

---

# FlowForge — Visual Logic Design for VS Code

FlowForge is a visual logic editor for designing and maintaining program flow and data relationships with blocks and connections inside VS Code. Diagrams are stored as editable `.flow.json` files designed to be readable by people and straightforward for AI tools to inspect. **FlowForge does not include an embedded AI chat feature.**

> Source baseline: **v0.8.2**. This repository is an active development snapshot; it does not imply that every planned requirement has been implemented and verified.

## Features

- Grid-aligned canvas and block layout based on a 22 px grid
- Flow/Data ports with direction and data-type validation
- Orthogonal connections with editable manual bends and locking
- Block selection, grouping, copying, and undo/redo-related functionality
- Manual logic validation and variable-based simulation functionality
- Versioned `settings.json` consolidating theme, grid, panel, and recent-file preferences
- Sidebar actions for **New Diagram**, **Open Existing Diagram**, and **Open Recent Diagram**
- AI development rules and requirement traceability through `AGENTS.md` and the requirements documents

See the [implementation status](docs/IMPLEMENTATION_STATUS.md) for the actual implementation scope and known limitations of individual features.

## Mouse interaction policy

- **Left-drag on empty canvas:** pan the canvas
- **Right-drag:** marquee-select blocks and intersecting connections
- **Right-click without dragging:** open the context menu
- **Left-drag a block:** move the block
- **Ctrl+A:** select all blocks and connections
- **Space:** intentionally unassigned in FlowForge

## Repository layout

```text
.
├── AGENTS.md
├── REQUIREMENTS/
│   └── MASTER.md
├── core/
├── docs/
├── examples/
├── media/
├── rust/
├── test/
└── package.json
```

## Development and testing

Requirements:
- VS Code Extension development environment
- Node.js for the extension and JavaScript tests
- Python for selected UI/integration tests
- Rust toolchain when building the Rust component

Useful checks:

```sh
node --check extension.js
node --check media/editor.js
node test/model.test.js
node test/simulation.test.js
cd rust && cargo test
```

Documentation:
- [AI development rules](AGENTS.md)
- [Master requirements](REQUIREMENTS/MASTER.md)
- [AI workflow](docs/AI_WORKFLOW.md)
- [Implementation status and known limitations](docs/IMPLEMENTATION_STATUS.md)
- [Full requirements details](docs/FlowForge_FULL_REQUIREMENTS.md)

## Installation

A VSIX installer is not included in this source snapshot. Package the extension separately with the appropriate VS Code extension packaging tools. Do not claim Windows VS Code Extension Host validation unless it has actually been performed.

## Contribution and change policy

1. Check the relevant requirement IDs before editing; do not reread the entire project for every task.
2. Preserve existing user changes and inspect `git diff`.
3. Make the smallest scoped change and add or update relevant tests.
4. Report test results as **pass**, **fail**, or **unverified**. Never claim an unrun test passed.
5. Update the requirements and implementation status when behavior or scope changes.
6. Show the diff and obtain explicit approval before committing. Push requires separate approval.

## License

No license has been specified yet. Until a license is added, all rights are reserved by default.
