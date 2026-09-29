/**
 * @module
 * Returns — public barrel. One component: the withdrawal panel the order page mounts, which owns
 * the button, its confirmation step and the list of returns already opened on that order. The
 * store stays inside, so no sibling grows a returns flow of its own beside it.
 */

export { default as WithdrawalPanel } from './components/WithdrawalPanel.vue';
