import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { runService } from '@/services'
import { useStoreStructureRestApi } from '@/composables/structureRestAPI.ts'
import type { IRun } from '@/models/run.model'
import type { IDataIdentificationKey as IProjectIdentificationKey } from '@/stores/projects.ts'


// Typescript, for now, doesn't allow a cleaner approach
export type IDataIdentificationKey = IRun['id'];


export const useRunsStore = defineStore('runs', () => {

  /**
   * Inherited
   */
  const {
    itemDictionary: runs,
    itemList: runsList,
    getRecord: getRun,
    addRecord: addRun,
    selectedIdentifier: selectedRunId,
    selectedRecord: currentRun,

    addToParent: addProjectRun,
    removeDuplicateChildren: removeDuplicateRuns,
    getRecordsByParent: getRunsByProject,

    loading,
    fetchByParent,
    fetchTarget
  } = useStoreStructureRestApi<IRun, IRun['id'], IProjectIdentificationKey>()

  // /**
  //  * Run belongsTo Project TODO some kind of circular logic could prevent this kind of interaction
  //  */
  // const {
  //   selectedProjectId
  // } = storeToRefs(useProjectsStore())

  /**
   *
   * @param projectId
   * @param forced
   */
  const fetchRuns = (projectId: IProjectIdentificationKey, forced = false) =>
    fetchByParent(
      runService.getRuns(projectId)
        .then(({ data }) => data),
      projectId,
      forced,
      true
    )

  /**
   * Fetch target run
   *
   * @param runId
   * @param forced
   */
  const fetchRun = (runId: IDataIdentificationKey, forced = false) =>
    fetchTarget(
      runService.getRun(runId)
        .then(({ data }) => data),
      runId,
      forced
    )

  // /**
  //  * Filtered runs by project
  //  */
  // const currentProjectRuns = computed(() =>
  //   selectedProjectId.value ?
  //     getRunsByProject(selectedProjectId.value) :
  //     []
  // )

  /**
   * Selected OS
   */
  const selectedOs = ref<string>()

  /**
   * Currently selected OS determine what runDetail to show
   */
  const currentRunDetails = computed(() =>
    selectedOs.value && currentRun.value?.runsDetail && currentRun.value.runsDetail.length > 0 ?
      currentRun.value.runsDetail.find(
        (runDetail) => runDetail.testedAppOs === selectedOs.value!.toUpperCase()
      ) : undefined
  )

  return {
    runs,
    runsList,
    getRun,
    addRun,
    selectedRunId,
    currentRun,
    getRunsByProject,

    addProjectRun,
    removeDuplicateRuns,

    loading,
    fetchRuns,
    fetchRun,

    selectedOs,
    currentRunDetails,
  }
})
