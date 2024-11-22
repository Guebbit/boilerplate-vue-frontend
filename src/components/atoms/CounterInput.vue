<template>
    <div class="counter-input">
        <label v-show="label.length > 0" :for="uuid">{{ label }}</label>
        <div>
            <button
                class="counter-sub"
                @click="subCounter"
            >-
            </button>
            <input
                :value="count?.toString()"
                @input="triggerUpdateInput"
                :id="uuid"
                type="text"
                :max="max"
                :min="min"
            />
            <button
                class="counter-add"
                @click="addCounter"
            >+
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { watch, defineModel } from 'vue'
import { getUuid } from '@guebbit/js-toolkit'

const {
    label = '',
    step = 0,
    min,
    max
} = defineProps<{
    /**
     * Max possible value
     */
    label?: string
    /**
     * add\sub steps
     */
    step?: number
    /**
     * Max possible value
     */
    max?: number
    /**
     * Min possible value
     */
    min?: number
}>()

/**
 * Unique ID to link input and label
 */
const uuid = getUuid()

/**
 *    Counter value
 */
const count = defineModel<number>()

/**
 *
 */
const triggerUpdateInput = (event: Event) => {
    if (!event.target)
        return
    const countInt = parseInt((event.target as HTMLInputElement).value)
    if (countInt || countInt === 0)
        count.value = countInt
}

/**
 * Update counter
 */
const updateCounter = (delta = 0) => {
    if (!count.value)
        return
    count.value += delta
}

/**
 * Subtract to counter
 */
const subCounter = () => updateCounter(-step)

/**
 * Add to counter
 */
const addCounter = () => updateCounter(step)

/**
 * HTML5 fix
 * Input type number "min" and "max" can't be trusted
 */
const fixCounter = () => {
    // if undefined or null
    if (!count.value)
        return
    // fix attr min
    if ((min || min === 0) && count.value < min)
        count.value = Math.max(count.value, min)
    // fix attr max
    if ((max || max === 0) && count.value > max)
        count.value = Math.min(count.value, max)
}

watch([
    count,
    min,
    max
], () => fixCounter())
</script>

<style lang="scss">
.counter-input {

    & > * {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    input {
        font-size: 1.2em;
        appearance: none;
        border: none;
        outline: none;
        padding: 0.5em 1em;
    }

    button {
        outline: none;
        text-transform: none;
        user-select: none;
        border-style: none;
        color: var(--button-text-color);
        background: var(--button-background-color);
        padding: 1em 2em;

        &:first-child {
            border-radius: 0.2em 0 0 0.2em;
        }

        &:last-child {
            border-radius: 0 0.2em 0.2em 0;
        }
    }
}
</style>
