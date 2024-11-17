import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getUuid } from '@guebbit/js-toolkit'

export enum IToastType {
    PRIMARY = 'primary',

}
export interface IToastMessage{
    id: string,
    message: string,
    type: IToastType,
    visible: boolean
}

/**
 *
 */
export const useToastStore = defineStore('toast', () => {
    /**
     * Settings
     */
    const history = ref([] as IToastMessage[]);

    /**
     * Visible messages
     */
    const messages = computed(() =>
        history.value.filter(({ visible }) => visible)
    );

    /**
     * Add a message then after a timeout and then remove it (FIFO)
     *
     * @param message
     * @param type
     * @param timeout
     */
    const addMessage = (message: string, type = IToastType.PRIMARY, timeout = -1) => {
        const id = getUuid();
        // Add to history
        history.value.push({
            id,
            message,
            type,
            visible: true,
        });
        // Remove after timeout (if any)
        if(timeout > 0)
            setTimeout(() => hideMessage(id), timeout);
    }

    /**
     * Find a message by id
     *
     * @param _id
     */
    const findMessage = (_id: string) =>
        history.value.find(({ id }) => id === _id);

    /**
     * Hide a message visiblity
     *
     * @param _id
     */
    const hideMessage = (_id: string) => {
        const message = findMessage(_id)
        if (message)
            message.visible = false
    };

    /**
     * Show a message visiblity
     *
     * @param _id
     */
    const showMessage = (_id: string) => {
        const message = findMessage(_id)
        if (message)
            message.visible = true
    };

    /**
     * Permanently remove a message (even from history)
     *
     * @param _id
     */
    const removeMessage = (_id: string) =>
        history.value = history.value.filter(({ id }) => id !== _id);

    return {
        history,
        messages,
        addMessage,
        findMessage,
        hideMessage,
        showMessage,
        removeMessage,
    };
});
