import { defineStore } from 'pinia';
import { projectService } from '@/services'
import { useRunsStore } from '@/stores/runs.ts'
import { useStoreStructureRestApi } from '@/composables/storeStructureRestApi.ts'
import type { IProject, IRun } from '@/types'

// Typescript, for now, doesn't allow a cleaner approach
export type IDataIdentificationKey = IProject["id"];


export const useProjectsStore = defineStore('projects', () => {

  /**
   * Inherited
   */
  const {
    itemDictionary: projects,
    itemList: projectsList,
    getRecord: getProject,
    addRecord: addProject,
    selectedIdentifier: selectedProjectId,
    selectedRecord: currentProject,

    loading,
    fetchAll,
    fetchTarget,
  } = useStoreStructureRestApi<IProject, IProject["id"]>("id");

  /**
   * Projects hasMany runs and
   * fetching the single project give us runsList
   */
  const {
    addRun,
    addProjectRun,
    removeDuplicateRuns,
  } = useRunsStore();

  /**
   * Projects hasMany Runs
   * Every project has a list of runs that have to be added to the global runs store
   *
   * @param projectId
   * @param runs
   */
  const addProjectRuns = (projectId: IDataIdentificationKey, runs: IRun[] = []) => {
    for(let i = 0, len = runs.length; i < len; i++){
      addRun(runs[i]);
      addProjectRun(projectId, runs[i].id);
    }
    removeDuplicateRuns(projectId);
  }

  /**
   *
   * @param forced
   */
  const fetchProjects = (forced = false) =>
    fetchAll(
      projectService.getProjects()
        .then(({ data }) => data),
      forced,
      true
    )

  /**
   *
   * @param projectId
   * @param forced
   */
  const fetchProject = (projectId: IDataIdentificationKey, forced = false) =>
    fetchTarget(
      projectService.getProject(projectId)
        .then(({ data }) => {
          // When fetching a single project: we also fetch its runs
          addProjectRuns(data.id, data.runList);
          return data
        }),
      projectId,
      forced
    )

  return {
    projects,
    projectsList,
    getProject,
    addProject,
    selectedProjectId,
    currentProject,

    loading,
    fetchProjects,
    fetchProject,

    addProjectRuns,
  }
})
