# 공개SW실무 9조 — Apache Superset

명지대학교 컴퓨터공학과 「공개SW실무」 9조 팀 프로젝트 저장소입니다.

- 대상 OSS: [Apache Superset](https://github.com/apache/superset)
- 추가 구현 방향(미확정): 새 차트 플러그인 1개 수준으로 작게
- 공식 기록은 이 저장소의 `team9/`(마크다운)에 남깁니다. 저장소 최상위의 `docs/`는 Superset 공식 문서이므로 건드리지 않습니다.

## 팀

| 이름 | 역할 | 계획서 파트 |
|---|---|---|
| 황동호 | 팀장 | 1장 요약문·목차·표지, 참고자료 취합, 3장 8) 기타, 최종 검수 |
| 이진 | | (10/11 회의에서 확정) |
| | | |
| | | |

## 일정

| 날짜 | 내용 |
|---|---|
| 10/11(일) 21:00 | Discord 킥오프 회의 |
| 10/18(일) | 추가 구현 범위 결정 (임시) |
| 10/22(목) | 파트별 초안 (임시) |
| 10/23~24 | 취합·검토 |
| 10/25(일) | 팀 제출 목표 |
| 10/26(월) 23:59 | 계획서 공식 마감 |

발표 4회(계획서·중간·최종·수업 발표) — 일정·발표자 미정

## 문서

- 계획서 작성: Google Docs 「공개SW실무 9조 - 계획서」 (탭: 원본 양식 / 작성용 / 팀원1~4 / 회의록)
- 계획서 구조와 파트 분담: [plan/README.md](plan/README.md)
- 회의록: [meetings/](meetings/) — `YYYY-MM-DD.md`
  - 회의 중에는 구글 독스 회의록 탭에 적고, 끝나면 팀장이 마크다운으로 옮겨 커밋

## 폴더 구조

```
team9/
  plan/        계획서 구조·파트 분담·근거 자료
  meetings/    회의록 (YYYY-MM-DD.md)
```

## 코드 작업 방식

- 저장소: [mju-oss-9/superset](https://github.com/mju-oss-9/superset) (apache/superset 포크)
- 기준 브랜치: `team9/main` — Superset `6.1.0` 태그에서 시작. 기본 브랜치로 지정되어 있습니다.
- 기능별 브랜치에서 작업합니다: `feature/treemap-color`, `feature/anomaly`, `feature/od-dashboard`, `feature/sql-precheck`
- 작업이 끝나면 `team9/main`으로 PR을 올리고, 1명 이상 승인을 받은 뒤 병합합니다. `team9/main`에 직접 푸시는 막혀 있습니다.
- PR을 만들 때 대상 저장소가 `apache/superset`이 아니라 `mju-oss-9/superset`인지 꼭 확인합니다. `gh`를 쓴다면 처음 한 번 `gh repo set-default mju-oss-9/superset`을 실행합니다.
- 저장소가 크므로 처음 받을 때는 `git clone --filter=blob:none https://github.com/mju-oss-9/superset.git`을 권장합니다.
