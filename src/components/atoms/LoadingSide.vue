<template>
  <div class="loading-side" />
</template>

<style lang="scss">
.loading-side{
  position: absolute;
  bottom: 0;
  right: 0;
  padding: 1em;

  &:after {
    content: "";
    display: block;
    width: 4em;
    height: 4em;
    border-radius: 50%;
    border-width: 6px;
    border-style: solid;
    border-color: var(--theme-on-surface) transparent var(--theme-on-surface) transparent;
    animation: loading-side-animation 1s linear infinite;
  }

  @keyframes loading-side-animation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}
</style>