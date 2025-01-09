import { onMounted, watch, type ComputedRef, type Ref  } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectsStore } from '@/stores/projects.ts'
import { useRunsStore } from '@/stores/runs.ts'
import { useEvidencesStore } from '@/stores/evidences.ts'
import { useReportsStore } from '@/stores/reports.ts'
import { useUsersStore } from '@/stores/users.ts'

/**
 * Automize and secure the process of fetching and selecting data
 */
export const usePageDataManagement = () => {

  /**
   * Data stores
   */
  const {
    fetchProject
  } = useProjectsStore()
  const {
    selectedProjectId
  } = storeToRefs(useProjectsStore())

  const {
    fetchRun
  } = useRunsStore()
  const {
    selectedRunId
  } = storeToRefs(useRunsStore())

  const {
    fetchEvidences,
    fetchEvidence,
  } = useEvidencesStore();
  const {
    selectedEvidenceId
  } = storeToRefs(useEvidencesStore());

  const {
    fetchReports,
  } = useReportsStore();

  const {
    fetchUser
  } = useUsersStore();
  const {
    selectedUserId
  } = storeToRefs(useUsersStore());

  /**
   * Automize and secure the process of fetching and selecting data
   * UI management through finalRoute and catchRoute
   * Target Project -> List of Runs
   *
   * @param projectId
   * @param finalRoute - Check data is valid, regardless of the promise's result
   * @param catchRoute - if errors are thrown
   */
  const pageTargetProject = (
    projectId: Ref | ComputedRef,
    finalRoute = () => {},
    catchRoute: (e: unknown) => void = () => {},
  ) => {
    // Select and fetch target data
    const selectAndFetch = () => {
      selectedProjectId.value = projectId.value;
      return fetchProject(projectId.value)
        .catch(catchRoute)
        .finally(finalRoute)
    }
    // Trigger on ref change and on mount
    watch(
      () => projectId.value,
      selectAndFetch
    )
    onMounted(selectAndFetch)
  }

  /**
   * Same as above
   * Target Project -> List of Runs
   * Target Project -> Target Run
   * Target Project -> Target Run -> List of evidences
   * Target Project -> Target Run -> List of reports
   *
   * @param projectId
   * @param runId
   * @param finalRoute
   * @param catchRoute
   */
  const pageTargetRun = (
    projectId: Ref | ComputedRef,
    runId: Ref | ComputedRef,
    finalRoute = () => {},
    catchRoute: (e: unknown) => void = () => {},
  ) => {
    // Select and fetch target data
    const selectAndFetch = () => {
      selectedProjectId.value = projectId.value;
      selectedRunId.value = runId.value;
      return Promise.all([
        fetchProject(projectId.value),
        fetchRun(runId.value),
        fetchEvidences(runId.value),
        fetchReports(runId.value),
      ])
        .catch(catchRoute)
        .finally(finalRoute)
    }
    // Trigger on ref change and on mount
    watch(
      [
        () => projectId.value,
        () => runId.value,
      ],
      selectAndFetch
    )
    onMounted(selectAndFetch)
  }

  /**
   * Same as above but for evidences
   * Target Project -> List of Runs
   * Target Project -> Target Run -> Target Evidence
   *
   * @param projectId
   * @param runId
   * @param evId
   * @param finalRoute
   * @param catchRoute
   */
  const pageTargetEvidence = (
    projectId: Ref | ComputedRef,
    runId: Ref | ComputedRef,
    evId: Ref | ComputedRef,
    finalRoute = () => {},
    catchRoute: (e: unknown) => void = () => {},
  ) => {
    // Select and fetch target data
    const selectAndFetch = () => {
      selectedProjectId.value = projectId.value;
      selectedRunId.value = runId.value;
      selectedEvidenceId.value = evId.value;
      return Promise.all([
        fetchProject(projectId.value),
        fetchRun(runId.value),
        fetchEvidence(evId.value)
      ])
        .catch(catchRoute)
        .finally(finalRoute)
    }
    // Trigger on ref change and on mount
    watch(
      [
        () => projectId.value,
        () => runId.value,
        () => evId.value,
      ],
      selectAndFetch
    )
    onMounted(selectAndFetch)
  }

  /**
   * Get user data
   *
   * @param userId
   * @param finalRoute - Check data is valid, regardless of the promise's result
   * @param catchRoute - if errors are thrown
   */
  const pageTargetUser = (
    userId: Ref | ComputedRef,
    finalRoute = () => {},
    catchRoute: (e: unknown) => void = () => {},
  ) => {
    // Select and fetch target data
    const selectAndFetch = () => {
      selectedUserId.value = userId.value;
      return fetchUser(userId.value)
        .catch(catchRoute)
        .finally(finalRoute)
    }
    // Trigger on ref change and on mount
    watch(
      () => userId.value,
      selectAndFetch
    )
    onMounted(selectAndFetch)
  }

  return {
    pageTargetProject,
    pageTargetRun,
    pageTargetEvidence,
    pageTargetUser,
  }
}


