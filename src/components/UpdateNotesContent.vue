<template>
  <div class="updateContent">
    <div class="releaseBadge">NEW UPDATE</div>
    <h1>암송과 기록이 더 편해졌어요</h1>
    <p class="intro">
      본문을 이어서 암송하고 날짜별 기록을 남기는 흐름을 다듬고, 모바일과 다크 모드에서도 편하게
      사용할 수 있도록 화면을 정리했습니다.
    </p>

    <section>
      <div class="icon">＋</div>
      <div>
        <h2>빈 날짜에도 바로 기록</h2>
        <p>
          주간·월간 화면에서 오늘이나 지난 빈 날짜를 눌러 암송 기록을 추가할 수 있습니다. 미래
          날짜는 선택되지 않으며, 오늘 기록이 있으면 기존 장절이 채워진 수정 화면이 바로 열립니다.
        </p>
      </div>
    </section>

    <section>
      <div class="icon">↓</div>
      <div>
        <h2>마지막 기록부터 이어서 암송</h2>
        <p>
          설정에서 ‘마지막 기록에서 시작’을 켜면 최근에 기록한 마지막 절로 자동 이동합니다. 여러
          장에 걸친 본문에는 장 구분 제목도 표시되어 현재 위치를 쉽게 알 수 있습니다.
        </p>
      </div>
    </section>

    <section>
      <div class="icon">◐</div>
      <div>
        <h2>다크 모드와 본문 설정</h2>
        <p>
          다크 모드를 추가하고 모든 주요 화면의 색상 대비를 조정했습니다. 설정에서 소제목을 가릴 수
          있으며, 글자 크기는 메뉴 첫 화면에서 이전처럼 바로 조절할 수 있습니다.
        </p>
      </div>
    </section>

    <section>
      <div class="icon">☰</div>
      <div>
        <h2>짧아진 메뉴와 모바일 화면</h2>
        <p>
          자주 쓰는 암송 기능만 첫 메뉴에 남기고 나머지는 설정으로 정리했습니다. 상단의 ‘암송
          도우미’를 누르면 언제든 홈으로 이동하며, 작은 모바일 화면에서도 메뉴가 간결하게 보입니다.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.updateContent {
  color: #111827;
}

.releaseBadge {
  width: fit-content;
  margin-bottom: 10px;
  border-radius: 999px;
  background: #e9f7ef;
  padding: 5px 9px;
  color: #168553;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
}

h1 {
  font-size: calc(23px * var(--scale, 1));
  font-weight: 900;
  letter-spacing: -0.03em;
}

.intro {
  margin: 7px 0 22px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.55;
}

section {
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 12px;
  padding: 15px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.07);
}

.icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #f3f4f6;
  color: #374151;
  font-weight: 900;
}

h2 {
  margin-bottom: 4px;
  font-size: 15px;
  font-weight: 900;
}

section p {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.55;
}
</style>
