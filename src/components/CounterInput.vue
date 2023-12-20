<template>
  <div class="counter-input">
    <label v-show="label.length > 0" :for="uuid">{{ label }}</label>
    <div>
      <button
          @click="modelValueC--"
      >-</button>
      <input
          v-model="modelValueC"
          :id="uuid"
          type="text"
          :max="max"
          :min="min"
      />
      <button
          @click="modelValueC++"
      >+</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineEmits, defineProps, watch } from "vue";
import { getUUID } from "@guebbit/javascript-library";

/**
 * v-model event
 */
const emit = defineEmits([
  'update:modelValue'
]);

const props = defineProps({
  /**
   * v-model
   */
  modelValue: {
    type: Number,
    default: () => 0
  },

  /**
   * Max possible value
   */
  label: {
    type: String,
    default: () => ""
  },

  /**
   * Max possible value
   */
  max: {
    type: Number,
    required: false
  },

  /**
   * Min possible value
   */
  min: {
    type: Number,
    required: false
  },
});

/**
 * Unique ID to link input and label
 */
const uuid = getUUID();

/**
 *	v-model support
 */
const modelValueC = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

/**
 * HTML5 fix
 * Input type number "min" and "max" can't be trusted
 */
watch(props, ({ modelValue, min, max }) => {
  // if undefined or null
  if(!modelValue && modelValue !== 0)
    return;
  // fix attr min
  if((min || min === 0)  && modelValue < min)
    emit('update:modelValue', Math.max(modelValue, min));
  // fix attr max
  if((max || max === 0) && modelValue > max)
    emit('update:modelValue', Math.min(modelValue, max));
}, {
  deep: true
});
</script>

<style lang="scss">
.counter-input{

  & > * {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  input{
    font-size: 1.2em;
    appearance: none;
    border: none;
    outline: none;
    padding: 0.5em 1em;
  }

  button{
    outline: none;
    text-transform: none;
    user-select: none;
    border-style: none;
    color: var(--button-text-color);
    background: var(--button-background-color);
    padding: 1em 2em;

    &:first-child{
      border-radius: 0.2em 0 0 0.2em;
    }
    &:last-child{
      border-radius: 0 0.2em 0.2em 0;
    }
  }
}
</style>