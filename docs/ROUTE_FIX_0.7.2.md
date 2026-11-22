# FlowForge 0.7.2 - 연결선 경로 데이터 복구

- 수동 경로에 대각선, 중복 좌표, 즉시 역방향 구간이 있으면 표시 경로로 사용하지 않고 자동 직각 경로로 대체합니다.
- 실제 edges에 존재하지 않는 layout.edges 항목을 문서 로드 시 제거합니다.
- 손상된 manualPath는 로드 시 제거하고 routingMode를 auto로 되돌립니다.
- 구간 드래그 결과를 정규화하고 유효한 연속 직각 경로인지 확인한 후 저장합니다.
- 회귀 테스트: 오래된 레이아웃 항목과 역방향 경로를 제거하는지 검사합니다.

검증: Node.js 테스트 3개 통과. 브라우저 자동 UI 테스트 중 edge_lock_and_geometry.py는 드래그 저장을 재현하지 못했고, grid_interaction.py는 시간 초과했습니다. 실제 Windows VSCode 통합 검증은 별도 필요합니다.
