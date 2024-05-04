<template>
  <div class="core-loading" />
</template>

<style lang="scss">
.core-loading{
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  // TODO colore
  background: red;

  &:after {
    // TODO cambiare e centrare
    position: absolute;
    top: 50%;
    right: 50%;
    transform: translate(-50%,-50%);

    content: "";
    display: block;
    width: 4em;
    height: 4em;
    border-radius: 50%;
    border-width: 6px;
    border-style: solid;
    border-color: var(--body-text-color) transparent var(--body-text-color) transparent;
    animation: core-loading-animation 1s linear infinite;
  }

  @keyframes core-loading-animation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}
</style>