import { defineStore, storeToRefs } from 'pinia'
import { evidencesService } from '@/services'
import { useStoreStructureRestApi } from '@/composables/storeStructureRestApi.ts'
import type { IEvidence } from '@/types'
import { type IDataIdentificationKey as IRunIdentificationKey, useRunsStore } from '@/stores/runs.ts'
import { computed } from 'vue'

// Typescript, for now, doesn't allow a cleaner approach
export type IDataIdentificationKey = IEvidence['id'];


export const useEvidencesStore = defineStore('evidences', () => {

  /**
   * Inherited
   */
  const {
    itemDictionary: evidences,
    itemList: evidencesList,
    getRecord: getEvidence,
    addRecord: addEvidence,
    selectedIdentifier: selectedEvidenceId,
    selectedRecord: currentEvidence,

    loading,
    fetchByParent,
    fetchTarget,
    updateTarget
  } = useStoreStructureRestApi<IEvidence, IEvidence['id'], IRunIdentificationKey>()

  /**
   * Run hasMany evidences
   */
  const {
    selectedOs
  } = storeToRefs(useRunsStore())

  /**
   *
   * @param runId
   * @param forced
   */
  const fetchEvidences = (runId: IRunIdentificationKey, forced = false) =>
    fetchByParent(
      evidencesService.getEvidences(runId)
        .then(({ data }) => data),
      runId,
      forced,
      true
    )

  /**
   *
   * @param evId
   * @param forced
   */
  const fetchEvidence = (evId: IDataIdentificationKey, forced = false) =>
    fetchTarget(
      evidencesService.getEvidence(evId)
        .then(({ data }) => data),
      evId,
      forced
    )

  /**
   *
   * @param evId
   * @param evidenceData
   */
  const updateEvidence = (evId: IDataIdentificationKey, evidenceData: Partial<IEvidence> = {}) =>
    updateTarget(
      evidencesService.changeEvidence(evId, evidenceData),
      evId,
      evidenceData
    )

  /**
   *
   * @param evId
   * @param accepted
   */
  const updateEvidenceStatus = (evId: IDataIdentificationKey, accepted: boolean) =>
    updateEvidence(evId, {
      accepted
    })

  /**
   * Filtered evidences by OS
   */
  const filteredEvidencesByOs = computed(() =>
    selectedOs.value ?
      evidencesList.value.filter(({ os }) => os === selectedOs.value!.toUpperCase()) :
      evidencesList.value
  )

  return {
    evidences,
    evidencesList,
    getEvidence,
    addEvidence,
    selectedEvidenceId,
    currentEvidence,

    loading,
    fetchEvidences,
    fetchEvidence,
    updateEvidence,
    updateEvidenceStatus,

    filteredEvidencesByOs
  }
})
