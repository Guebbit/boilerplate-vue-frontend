import { computed } from 'vue'
import { useCoreStore } from '@/stores/core'
import { useStructureDataManagement } from '@/composables/structureDataManagement.ts'
import { getUuid } from '@guebbit/js-toolkit'


export const useStructureRestApi = <
    // type of item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Record<string | number | symbol, any> = Record<string, any>,
    // type of item[identifier]
    K extends string | number | symbol = keyof T,
    // type of parent[identifier], where the parent is in a relation "belogsTo" with an unknown data
    // WARNING: Typescript is not inferring correctly between different composables and use the default type
    P extends string | number | symbol = string | number | symbol,
>({
    //  The identification parameter of the project type (READONLY and not exported)
    identifier = 'id',
    // Unique key for loading management
    // If falsy: doesn't update the global loading state
    loadingKey = getUuid(),
    // Time To Live for the "fetchAll" method
    allTTL = 3_600_000,      // 1 hour
    // Time To Live for the "fetchTarget" method
    targetTTL = 3_600_000    // 1 hour
  } = {}
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
    getRecordsByParent
  } = useStructureDataManagement<T, K, P>(identifier)

  /**
   * loadings
   */
  const {
    setLoading,
    getLoading
  } = useCoreStore()
  // loading mutators
  const startLoading = (postfix = "") => loadingKey && setLoading(loadingKey + postfix, true)
  const stopLoading = (postfix = "") => loadingKey && setLoading(loadingKey + postfix, false)
  // Check if it's loading
  const loading = computed(() => getLoading(loadingKey))

  /**
   * Time To Live and Last Update
   * Optimize fetch requests by caching data and preventing unnecessary requests
   */
  let lastUpdateAll = 0
  const lastUpdateTarget = {} as Record<K, number>
  const lastUpdateParent = {} as Record<P, number>

  /**
   * Generic fetch for all types of requests,
   * Just for loading management
   *
   * @param apiCall
   * @param enableLoading
   * @param loadingPostfix
   */
  const fetchAny = <F>(
      apiCall: Promise<F>,
      enableLoading = true,
      loadingPostfix = ""
  ) => {
    if (enableLoading)
      startLoading(loadingPostfix)
    // request
    return apiCall
        .finally(() => enableLoading && stopLoading(loadingPostfix))
  }

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
   * @param loadingPostfix - custom loading key
   */
  const fetchAll = (
      apiCall: Promise<T[]>,
      forced = false,
      fetchMismatch = false,
      enableLoading = true,
      loadingPostfix = ""
  ) => {
    // If TTL is not expired, the current stored data is still valid
    if (forced || Date.now() - lastUpdateAll < allTTL)
      return Promise.resolve(itemDictionary.value)

    // Proceed with the request, but first update the lastUpdate
    lastUpdateAll = Date.now()
    if (enableLoading)
      startLoading(loadingPostfix)

    // request
    return apiCall
        .then((items = [] as T[]) => {
          for (let index = 0, length_ = items.length; index < length_; index++) {
            addRecord(items[index])
            if (!fetchMismatch)
              lastUpdateTarget[items[index][identifier] as K] = Date.now()
          }
          lastUpdateAll = Date.now()
        })
        .catch((error) => {
          // Reset TTL in case of error
          lastUpdateAll = 0
          throw error
        })
        .finally(() => enableLoading && stopLoading(loadingPostfix))
  }

  /**
   * Same as fetchAll, but with a parent identifier (belongsTo relationship)
   *
   * @param apiCall
   * @param parentId
   * @param forced
   * @param fetchMismatch
   * @param enableLoading
   * @param loadingPostfix - custom loading key
   */
  const fetchByParent = (
      apiCall: Promise<T[]>,
      parentId: P,
      forced = false,
      fetchMismatch = false,
      enableLoading = true,
      loadingPostfix = ""
  ) => {
    // If TTL is not expired, the current stored data is still valid
    if (forced || Date.now() - lastUpdateParent[parentId] < allTTL)
      return Promise.resolve(getRecordsByParent(parentId))

    // Proceed with the request, but first update the lastUpdate
    lastUpdateParent[parentId] = Date.now()
    if (enableLoading)
      startLoading(loadingPostfix)

    // request
    return apiCall
        .then((items = [] as T[]) => {
          for (let index = 0, length_ = items.length; index < length_; index++) {
            addToParent(parentId, items[index][identifier])
            if (fetchMismatch) {
              // if mismatch, we don't want to overwrite the fetchTarget's item
              editRecord(items[index][identifier], items[index], true)
            } else {
              // no mismatch so we can add item AND update the target lastUpdate
              addRecord(items[index])
              lastUpdateTarget[items[index][identifier] as K] = Date.now()
            }
          }
          removeDuplicateChildren(parentId)
          lastUpdateParent[parentId] = Date.now()
        })
        .catch((error) => {
          // Reset TTL in case of error
          lastUpdateParent[parentId] = 0
          throw error
        })
        .finally(() => enableLoading && stopLoading(loadingPostfix))
  }

  /**
   * Get target item from server
   *
   * @param apiCall
   * @param id
   * @param forced
   * @param enableLoading
   * @param loadingPostfix - custom loading key
   */
  const fetchTarget = (
      apiCall: Promise<T | undefined>,
      id: K,
      forced = false,
      enableLoading = true,
      loadingPostfix = ""
  ) => {
    // If TTL is not expired, the current stored data is still valid
    if (forced || Date.now() - (lastUpdateTarget[id] ?? 0) < targetTTL)
      return Promise.resolve(getRecord(id))

    // Proceed with the request, but first update the lastUpdate
    lastUpdateTarget[id] = Date.now()
    if (enableLoading)
      startLoading(loadingPostfix)

    // request
    return apiCall
        .then((item: T | undefined) => {
          if (item)
            addRecord(item)
          lastUpdateTarget[id] = Date.now()
          return getRecord(id)
        })
        .catch((error: unknown) => {
          // Reset TTL in case of error
          lastUpdateTarget[id] = 0
          throw error
        })
        .finally(() => enableLoading && stopLoading(loadingPostfix))
  }

  /**
   * dummyData: Create data immediately and then update it later
   * when the server returns the real data
   *
   * @param apiCall
   * @param dummyData
   * @param fetchLike
   * @param enableLoading
   * @param loadingPostfix - custom loading key
   */
  const createTarget = (
      apiCall: Promise<T | undefined>,
      dummyData?: T,
      fetchLike = true,
      enableLoading = true,
      loadingPostfix = ""
  ) => {
    const temporaryId = getUuid()
    // Create temporary item with temporary id for instantaneity
    if (dummyData)
      addRecord({
        ...dummyData,
        [identifier]: temporaryId
      })
    if (enableLoading)
      startLoading(loadingPostfix)
    // request
    return apiCall
        .then((item: T | undefined) => {
          if (!item)
            return
          const id = item[identifier] as K
          // Remove the temporary item and add the real one
          if (dummyData)
            deleteRecord(temporaryId as K)
          addRecord(item)
          // If it can be treated as a fetchTarget
          if (fetchLike)
            lastUpdateTarget[id] = Date.now()
          return getRecord(id)
        })
        .catch((error: unknown) => {
          // rollback
          deleteRecord(temporaryId as K)
          throw error
        })
        .finally(() => enableLoading && stopLoading(loadingPostfix))
  }

  /**
   *
   * @param apiCall
   * @param id
   * @param itemData
   * @param enableLoading
   * @param loadingPostfix - custom loading key
   */
  // TODO typings
  const updateTarget = <F = any>(
      apiCall: Promise<any>,
      id: K,
      itemData: Partial<T>,
      enableLoading = true,
      loadingPostfix = ""
  ) => {
    const oldItemData = getRecord(id)
    editRecord(id, itemData)
    if (enableLoading)
      startLoading(loadingPostfix)
    return apiCall
        .catch((error) => {
          // Rollback in case of error
          if (oldItemData)
            editRecord(id, oldItemData)
          throw error
        })
        .finally(() => enableLoading && stopLoading(loadingPostfix))
  }

  /**
   *
   * @param apiCall
   * @param id
   * @param enableLoading
   * @param loadingPostfix - custom loading key
   */
  // TODO typings
  const deleteTarget = <F = unknown>(
      apiCall: Promise<F>,
      id: K,
      enableLoading = true,
      loadingPostfix = ""
  ) => {
    const oldItemData = getRecord(id)
    deleteRecord(id)
    if (enableLoading)
      startLoading(loadingPostfix)
    return apiCall
        .catch((error) => {
          // Rollback in case of error
          if (oldItemData)
            addRecord(oldItemData)
          throw error
        })
        .finally(() => enableLoading && stopLoading(loadingPostfix))
  }

  return {
    // settings (default value could be necessary)
    identifier,
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
    fetchAny,
    fetchAll,
    fetchByParent,
    fetchTarget,
    createTarget,
    updateTarget,
    deleteTarget
  }
}
