import { useStore } from "@/store";
import { computed, onBeforeMount, toRefs } from "vue";
import { getUUID } from "@guebbit/javascript-library";

export default <T = any>(
    loadPromise :Promise<T> = Promise.resolve(),
) => {
  const {
    state,
    getters,
    commit
  } = useStore();

  const { loading } = toRefs(state.main);
  const { userInfo } = toRefs(state.user);

  const loadingName = getUUID();

  /**
   * Settings
   */
  const {
    defaultLoading = true
  } = settings;

  /**
   *
   */
  const isAuthenticated = computed<boolean>(() => getters['user/isAuthenticated']);

  /**
   *
   */
  const loadingItems = computed(() => loading.value.includes(loadingName));

  // const resourceHandleSuccess = () => {};
  // const resourceHandleError = () => {};

  /**
   * Load items required (or single target item?)
   */
  const loadItems = () => {
    if(defaultLoading)
      commit('main/startLoading', loadingName);
    loadPromise
        // .then(resourceHandleSuccess)
        // .catch(resourceHandleError)
        .finally(() => {
          if(defaultLoading)
            commit('main/stopLoading', loadingName);
        });
  };

  onBeforeMount(() => {
    loadItems();
  })

  return {
    loading: loadingItems,
    userInfo,
    isAdmin: userInfo.value.isAdmin && isAuthenticated.value,
    isAuthenticated,
  };
};