<template>
  <div class="updateContent">
    <div class="releaseBadge">NEW UPDATE</div>
    <h1>암송 기록이 새로 생겼어요</h1>
    <p class="intro">
      암송에 집중하는 방식은 그대로 두고, 연습한 범위를 간편하게 남기고 돌아볼 수 있도록 기능을
      추가했습니다.
    </p>

    <section>
      <div class="icon">✓</div>
      <div>
        <h2>카카오 로그인과 암송 기록</h2>
        <p>
          카카오 계정으로 로그인하면 열어본 절의 처음과 마지막 범위가 자동으로 입력됩니다. 날짜와
          장절을 수정한 뒤 저장하고, 주간·월간 화면에서 기록을 확인할 수 있습니다.
        </p>
      </div>
    </section>

    <section>
      <div class="icon">◐</div>
      <div>
        <h2>전체 가리기와 전체 열기</h2>
        <p>
          암송 화면의 메뉴에서 모든 절을 한 번에 가리거나 열 수 있습니다. 필요한 절만 눌러 확인하는
          기존 방식도 그대로 사용할 수 있습니다.
        </p>
      </div>
    </section>

    <section>
      <div class="icon">↗</div>
      <div>
        <h2>암송별 진행률</h2>
        <p>
          저장한 암송 범위를 바탕으로 본문별 진행률을 계산합니다. 같은 절을 여러 번 기록해도 한 번만
          반영됩니다.
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
