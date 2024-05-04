<template>
  <div class="side-loading" />
</template>

<style lang="scss">
.side-loading{
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
    border-color: var(--body-text-color) transparent var(--body-text-color) transparent;
    animation: side-loading-animation 1s linear infinite;
  }

  @keyframes side-loading-animation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}
</style>