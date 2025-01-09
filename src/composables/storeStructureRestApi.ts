import { computed } from 'vue'
import { useCoreStore } from "@/stores/core";
import { useStoreStructureData } from '@/composables/storeStructureData.ts'
import { getUuid } from '@guebbit/js-toolkit'



export const useStoreStructureRestApi = <
    // type of item
    T extends Record<string | number | symbol, any> = Record<string, any>,
    // type of item[identifier]
    K extends string | number | symbol = keyof T,
    // type of parent[identifier], where the parent is in a relation "belogsTo" with an unknown data
    // WARNING: Typescript is not inferring correctly between different composables and use the default type
    P extends string | number | symbol = string | number | symbol,
>(
    //  The identification parameter of the project type (READONLY and not exported)
    itemIdentifier = "id",
    // Unique key for loading management
    // If falsy: doesn't update the global loading state
    loadingKey = getUuid(),
    // Time To Live for the "fetchAll" method
    allTTL = 3_600_000,       // 1 hour
    // Time To Live for the "fetchTarget" method
    targetTTL = 3_600_000,    // 1 hour
) => {

  /**
   * Inherited
   */
  const {
    itemDictionary,
    itemList,
    getRecord,
    addRecord,
    editRecord,
    deleteRecord,
    selectedIdentifier,
    selectedRecord,

    parentHasMany,
    addToParent,
    removeFromParent,
    removeDuplicateChildren,
    getRecordsByParent,
  } = useStoreStructureData<T, K, P>(itemIdentifier);

  /**
   * loadings
   */
  const {
    setLoading,
    getLoading
  } = useCoreStore();
  // loading mutators
  const startLoading = () => loadingKey && setLoading(loadingKey, true);
  const stopLoading = () => loadingKey && setLoading(loadingKey, false);
  // Check if it's loading
  const loading = computed(() => getLoading(loadingKey));

  /**
   * Time To Live and Last Update
   * Optimize fetch requests by caching data and preventing unnecessary requests
   */
  let lastUpdateAll = 0;
  let lastUpdateTarget = {} as Record<K, number>;
  let lastUpdateParent = {} as Record<P, number>;

  /**
   * Get ALL items from server
   *
   * fetchMismatch:
   * When the fetchAll and fetchTarget api calls single items are different:
   * they don't have to be in sync nor the fetchAll must overwrite the fetchTarget item.
   *
   * Example: fetchAll retrieve a list of items and fetchTarget retrieve a single item WITH DETAILS
   *
   * @param apiCall
   * @param forced
   * @param fetchMismatch
   * @param enableLoading
   */
  const fetchAll = (
      apiCall: Promise<T[]>,
      forced = false,
      fetchMismatch = false,
      enableLoading = true,
  ) => {
    // If TTL is not expired, the current stored data is still valid
    if(forced || Date.now() - lastUpdateAll < allTTL)
      return Promise.resolve(itemDictionary.value);

    // Proceed with the request, but first update the lastUpdate
    lastUpdateAll = Date.now();
    if(enableLoading)
      startLoading();

    // request
    return apiCall
        .then((items = [] as T[]) => {
          for(let i = 0, len = items.length; i < len; i++){
            addRecord(items[i]);
            if(!fetchMismatch)
              lastUpdateTarget[items[i][itemIdentifier] as K] = Date.now();
          }
          lastUpdateAll = Date.now();
        })
        .catch((error) => {
          // Reset TTL in case of error
          lastUpdateAll = 0;
          throw error
        })
        .finally(() => enableLoading && stopLoading())
  }

  /**
   * Same as fetchAll, but with a parent identifier (belongsTo relationship)
   *
   * @param apiCall
   * @param parentId
   * @param forced
   * @param fetchMismatch
   * @param enableLoading
   */
  const fetchByParent = (
      apiCall: Promise<T[]>,
      parentId: P,
      forced = false,
      fetchMismatch = false,
      enableLoading = true,
  ) => {
    // If TTL is not expired, the current stored data is still valid
    if(forced || Date.now() - lastUpdateParent[parentId] < allTTL)
      return Promise.resolve(getRecordsByParent(parentId));

    // Proceed with the request, but first update the lastUpdate
    lastUpdateParent[parentId] = Date.now();
    if(enableLoading)
      startLoading();

    // request
    return apiCall
        .then((items = [] as T[]) => {
          for(let i = 0, len = items.length; i < len; i++){
            addToParent(parentId, items[i][itemIdentifier]);
            if(fetchMismatch){
              // if mismatch, we don't want to overwrite the fetchTarget's item
              editRecord(items[i][itemIdentifier], items[i], true);
            }else{
              // no mismatch so we can add item AND update the target lastUpdate
              addRecord(items[i]);
              lastUpdateTarget[items[i][itemIdentifier] as K] = Date.now();
            }
          }
          removeDuplicateChildren(parentId);
          lastUpdateParent[parentId] = Date.now();
        })
        .catch((error) => {
          // Reset TTL in case of error
          lastUpdateParent[parentId] = 0;
          throw error
        })
        .finally(() => enableLoading && stopLoading())
  }

  /**
   * Get target item from server
   *
   * @param apiCall
   * @param id
   * @param forced
   * @param enableLoading
   */
  const fetchTarget = (
      apiCall: Promise<T>,
      id: K,
      forced = false,
      enableLoading = true,
  ) => {
    // If TTL is not expired, the current stored data is still valid
    if(forced || Date.now() - lastUpdateTarget[id] < targetTTL)
      return Promise.resolve(getRecord(id));

    // Proceed with the request, but first update the lastUpdate
    lastUpdateTarget[id] = Date.now();
    if(enableLoading)
      startLoading();

    // request
    return apiCall
        .then((item: T) => {
          if(item)
            addRecord(item);
          lastUpdateTarget[id] = Date.now();
          return getRecord(id);
        })
        .catch((error: unknown) => {
          // Reset TTL in case of error
          lastUpdateTarget[id] = 0;
          throw error
        })
        .finally(() => enableLoading && stopLoading())
  }

  /**
   *
   * @param apiCall
   * @param enableLoading
   */
  const createTarget = <F = T>(
      apiCall: Promise<F>,
      enableLoading = true,
  ) => {
    if(enableLoading)
      startLoading();
    return apiCall
        .finally(() => enableLoading && stopLoading())
  }

  /**
   *
   * @param apiCall
   * @param id
   * @param itemData
   * @param enableLoading
   */
  const updateTarget = <F = any>(
      apiCall: Promise<any>,
      id: K,
      itemData: Partial<T>,
      enableLoading = true,
  ) => {
    const oldItemData = getRecord(id);
    editRecord(id, itemData);
    if(enableLoading)
      startLoading();
    return apiCall
        .catch((error) => {
          // Rollback in case of error
          if(oldItemData)
            editRecord(id, oldItemData);
          throw error
        })
        .finally(() => enableLoading && stopLoading())
  }

  /**
   *
   * @param apiCall
   * @param id
   * @param enableLoading
   */
  const deleteTarget = <F = unknown>(
      apiCall: Promise<F>,
      id: K,
      enableLoading = true,
  ) => {
    const oldItemData = getRecord(id);
    deleteRecord(id);
    if(enableLoading)
      startLoading();
    return apiCall
        .catch((error) => {
          // Rollback in case of error
          if(oldItemData)
            addRecord(oldItemData);
          throw error
        })
        .finally(() => enableLoading && stopLoading())
  }

  return {
    // settings (default value could be necessary)
    itemIdentifier,
    allTTL,
    targetTTL,
    loadingKey,

    // core structure
    itemDictionary,
    itemList,
    getRecord,
    addRecord,
    editRecord,
    deleteRecord,
    selectedIdentifier,
    selectedRecord,

    // belongsTo relationship
    parentHasMany,
    addToParent,
    removeFromParent,
    removeDuplicateChildren,
    getRecordsByParent,

    // api calls
    startLoading,
    stopLoading,
    loading,
    lastUpdateAll,
    lastUpdateTarget,
    lastUpdateParent,
    fetchAll,
    fetchByParent,
    fetchTarget,
    createTarget,
    updateTarget,
    deleteTarget,
  }
};
