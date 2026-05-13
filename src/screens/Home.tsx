import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen as faFolderRegular } from '@fortawesome/free-regular-svg-icons';
import { fa1, fa2, fa3, faCheck, faCodeBranch, faPenToSquare, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Sidebar } from '../components/layout/Sidebar';
import { ProjectItem } from '../components/layout/ProjectItem';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import {
  createProject,
  createRepo,
  createSession,
  deleteProject,
  deleteRepo,
  getProjectList,
  openChatWindow,
  pickRepoFolder,
  renameProject,
  renameRepo,
  resetPersistedState,
  restoreStateFromBackup
} from '../lib/tauri';
import type { OnboardingStep } from './homeOnboarding';
import {
  addOnboardingRepo,
  buildOnboardingDoneSummary,
  canContinueFromRepoStep,
  getOnboardingBackStep,
  getOnboardingNextStepFromRepos,
  inferRepoNameFromPath,
  isProjectNameValid,
  isRepoAlreadyAdded
} from './homeOnboarding';
import type { Project, Repo } from '../types';
import { ChatWindow } from './ChatWindow';

interface HomeProps {
  view: 'home' | 'chat';
  onViewChange: (view: 'home' | 'chat') => void;
}

const onboardingSteps: Array<{ id: OnboardingStep; label: string; icon: typeof fa1 }> = [
  { id: 'name', label: 'Name', icon: fa1 },
  { id: 'repos', label: 'Add repos', icon: fa2 },
  { id: 'done', label: 'Done', icon: fa3 }
];

const sessionDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const sessionTimeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

function formatSessionTimestamp(updatedAt: number): string {
  const date = new Date(updatedAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysDifference = Math.round((today.getTime() - day.getTime()) / (24 * 60 * 60 * 1000));

  if (daysDifference === 0) {
    return `Today at ${sessionTimeFormatter.format(date)}`;
  }
  if (daysDifference === 1) {
    return 'Yesterday';
  }
  return sessionDateFormatter.format(date);
}

function areSessionsEquivalent(a: Project['sessions'], b: Project['sessions']): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (
      left.id !== right.id ||
      left.name !== right.name ||
      left.role !== right.role ||
      left.updatedAt !== right.updatedAt ||
      left.excerpt !== right.excerpt
    ) {
      return false;
    }
  }
  return true;
}

function getRolePillStyle(role: string): CSSProperties {
  const normalizedRole = role.trim().toLowerCase();
  const roleTokenByName: Record<string, string> = {
    architect: 'architect',
    'business analyst': 'analyst',
    developer: 'developer',
    'devops engineer': 'devops',
    'qa lead': 'qa-lead',
    tester: 'tester',
    'test automation expert': 'automation',
    'db expert': 'db-expert',
    'security reviewer': 'security',
    'technical writer': 'tech-writer'
  };
  const roleToken = roleTokenByName[normalizedRole];
  if (!roleToken) {
    return {};
  }

  return {
    backgroundColor: `var(--color-role-${roleToken}-bg)`,
    borderColor: `var(--color-role-${roleToken}-fg)`,
    color: `var(--color-role-${roleToken}-fg)`
  };
}

export function Home({ view, onViewChange }: HomeProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [showAddRepoForm, setShowAddRepoForm] = useState(false);
  const [addingRepo, setAddingRepo] = useState(false);
  const [pickingRepoFolder, setPickingRepoFolder] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPath, setNewRepoPath] = useState('');
  const [addRepoError, setAddRepoError] = useState<string | null>(null);
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [editingProjectTitle, setEditingProjectTitle] = useState(false);
  const [renamingProject, setRenamingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [editingRepoId, setEditingRepoId] = useState<string | null>(null);
  const [editingRepoName, setEditingRepoName] = useState('');
  const [renamingRepoId, setRenamingRepoId] = useState<string | null>(null);
  const [deletingRepoId, setDeletingRepoId] = useState<string | null>(null);
  const [stateAction, setStateAction] = useState<'reset' | 'restore' | null>(null);
  const [stateActionError, setStateActionError] = useState<string | null>(null);

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('name');
  const [onboardingProjectName, setOnboardingProjectName] = useState('');
  const [onboardingProjectId, setOnboardingProjectId] = useState<string | null>(null);
  const [onboardingRepos, setOnboardingRepos] = useState<Repo[]>([]);
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  const [initialChatSessionId, setInitialChatSessionId] = useState<string | undefined>();
  const onboardingStepIndex = onboardingSteps.findIndex((step) => step.id === onboardingStep);
  const onboardingDoneSummary = useMemo(
    () => buildOnboardingDoneSummary(onboardingProjectName, onboardingRepos),
    [onboardingProjectName, onboardingRepos]
  );

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const loadedProjects = await getProjectList();
        if (!mounted) {
          return;
        }

        setProjects(loadedProjects);
        setSelectedProjectId((prev) => prev ?? loadedProjects[0]?.id);
      } catch (error) {
        if (!mounted) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        setProjectsError(message || 'Failed to load projects.');
      } finally {
        if (mounted) {
          setLoadingProjects(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedProject = useMemo(() => {
    if (!projects.length) {
      return undefined;
    }
    return projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  }, [projects, selectedProjectId]);

  const handleProjectSessionsChange = useCallback(
    (sessions: Project['sessions']) => {
      if (!selectedProjectId) {
        return;
      }
      setProjects((state) =>
        state.map((project) =>
          project.id === selectedProjectId
            ? areSessionsEquivalent(project.sessions, sessions)
              ? project
              : {
                  ...project,
                  sessions
                }
            : project
        )
      );
    },
    [selectedProjectId]
  );

  useEffect(() => {
    setProjectNameDraft(selectedProject?.name ?? '');
    setEditingProjectTitle(false);
  }, [selectedProject?.id, selectedProject?.name]);

  const reloadProjects = async () => {
    const loadedProjects = await getProjectList();
    setProjects(loadedProjects);
    setSelectedProjectId(loadedProjects[0]?.id);
  };

  const openNewProjectFlow = () => {
    setOnboardingOpen(true);
    setOnboardingStep('name');
    setOnboardingProjectName('');
    setOnboardingProjectId(null);
    setOnboardingRepos([]);
    setOnboardingError(null);
    setOnboardingBusy(false);
  };

  const resetOnboardingFlow = () => {
    setOnboardingOpen(false);
    setOnboardingStep('name');
    setOnboardingProjectName('');
    setOnboardingProjectId(null);
    setOnboardingRepos([]);
    setOnboardingError(null);
    setOnboardingBusy(false);
  };

  const cancelNewProjectFlow = async () => {
    if (onboardingBusy) {
      return;
    }

    const projectIdToDelete = onboardingProjectId;
    if (!projectIdToDelete) {
      resetOnboardingFlow();
      return;
    }

    setOnboardingBusy(true);
    setOnboardingError(null);
    try {
      await deleteProject(projectIdToDelete);
      setProjects((state) => {
        const next = state.filter((project) => project.id !== projectIdToDelete);
        setSelectedProjectId(next[0]?.id);
        return next;
      });
      resetOnboardingFlow();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOnboardingError(message || 'Failed to cancel onboarding and delete the project.');
      setOnboardingBusy(false);
    }
  };

  const handleOnboardingNameContinue = async () => {
    if (onboardingBusy) {
      return;
    }

    if (!isProjectNameValid(onboardingProjectName)) {
      setOnboardingError('Project name is required.');
      return;
    }

    setOnboardingBusy(true);
    setOnboardingError(null);
    try {
      const created = await createProject(onboardingProjectName.trim());
      setProjects((state) => [created, ...state]);
      setSelectedProjectId(created.id);
      setOnboardingProjectId(created.id);
      setOnboardingStep('repos');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOnboardingError(message || 'Failed to create project.');
    } finally {
      setOnboardingBusy(false);
    }
  };

  const handleOnboardingAddRepo = async () => {
    if (!onboardingProjectId || onboardingBusy) {
      return;
    }

    setOnboardingBusy(true);
    setOnboardingError(null);
    try {
      const selected = await pickRepoFolder();
      if (!selected) {
        return;
      }

      if (isRepoAlreadyAdded(onboardingRepos, selected)) {
        setOnboardingError('This repository has already been added to the project.');
        return;
      }

      const created = await createRepo(onboardingProjectId, inferRepoNameFromPath(selected), selected);
      setOnboardingRepos((state) => addOnboardingRepo(state, created));
      setProjects((state) =>
        state.map((project) =>
          project.id === onboardingProjectId ? { ...project, repos: addOnboardingRepo(project.repos, created) } : project
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOnboardingError(message || 'This folder does not appear to be a git repository.');
    } finally {
      setOnboardingBusy(false);
    }
  };

  const handleOnboardingRemoveRepo = async (repoId: string) => {
    if (!onboardingProjectId || onboardingBusy) {
      return;
    }

    setOnboardingBusy(true);
    setOnboardingError(null);
    try {
      await deleteRepo(onboardingProjectId, repoId);
      setOnboardingRepos((state) => state.filter((repo) => repo.id !== repoId));
      setProjects((state) =>
        state.map((project) =>
          project.id === onboardingProjectId ? { ...project, repos: project.repos.filter((repo) => repo.id !== repoId) } : project
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOnboardingError(message || 'Failed to remove repository.');
    } finally {
      setOnboardingBusy(false);
    }
  };

  const handleOnboardingReposContinue = () => {
    const nextStep = getOnboardingNextStepFromRepos(onboardingRepos.length);
    if (!nextStep) {
      setOnboardingError('Add at least one repository to continue.');
      return;
    }

    setOnboardingError(null);
    setOnboardingStep(nextStep);
  };

  const handleOnboardingOpenChat = async () => {
    if (!onboardingProjectId || onboardingBusy) {
      return;
    }

    setOnboardingBusy(true);
    setOnboardingError(null);
    try {
      const createdSession = await createSession(onboardingProjectId, 'Developer', 'New Session');
      setProjects((state) =>
        state.map((project) =>
          project.id === onboardingProjectId
            ? {
                ...project,
                sessions: [createdSession, ...project.sessions.filter((session) => session.id !== createdSession.id)]
              }
            : project
        )
      );
      setSelectedProjectId(onboardingProjectId);
      setInitialChatSessionId(createdSession.id);
      await openChatWindow(onboardingProjectId, createdSession.id);
      resetOnboardingFlow();
      onViewChange('chat');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOnboardingError(message || 'Failed to open chat.');
    } finally {
      setOnboardingBusy(false);
    }
  };

  const handleAddRepo = async () => {
    if (!selectedProject || addingRepo) {
      return;
    }

    setAddRepoError(null);
    setAddingRepo(true);
    try {
      const created = await createRepo(selectedProject.id, newRepoName, newRepoPath);
      setProjects((state) =>
        state.map((project) =>
          project.id === selectedProject.id
            ? { ...project, repos: [...project.repos, created] }
            : project
        )
      );
      setNewRepoName('');
      setNewRepoPath('');
      setShowAddRepoForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAddRepoError(message || 'Failed to add repository.');
    } finally {
      setAddingRepo(false);
    }
  };

  const handlePickRepoFolder = async () => {
    if (pickingRepoFolder) {
      return;
    }

    setPickingRepoFolder(true);
    try {
      const selected = await pickRepoFolder();
      if (selected) {
        setNewRepoPath(selected);
        if (!newRepoName.trim()) {
          setNewRepoName(inferRepoNameFromPath(selected));
        }
        if (addRepoError) {
          setAddRepoError(null);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAddRepoError(message || 'Failed to open folder picker.');
    } finally {
      setPickingRepoFolder(false);
    }
  };

  const handleRenameProject = async (): Promise<boolean> => {
    if (!selectedProject || renamingProject) {
      return false;
    }

    setRenamingProject(true);
    setProjectsError(null);
    try {
      const renamed = await renameProject(selectedProject.id, projectNameDraft);
      setProjects((state) => state.map((project) => (project.id === renamed.id ? { ...project, name: renamed.name } : project)));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setProjectsError(message || 'Failed to rename project.');
      return false;
    } finally {
      setRenamingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject || deletingProject) {
      return;
    }

    const confirmed = window.confirm(`Delete project "${selectedProject.name}"? This removes local project metadata.`);
    if (!confirmed) {
      return;
    }

    setDeletingProject(true);
    setProjectsError(null);
    try {
      await deleteProject(selectedProject.id);
      setProjects((state) => {
        const next = state.filter((project) => project.id !== selectedProject.id);
        setSelectedProjectId(next[0]?.id);
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setProjectsError(message || 'Failed to delete project.');
    } finally {
      setDeletingProject(false);
    }
  };

  const handleRenameRepo = async (repoId: string) => {
    if (!selectedProject || renamingRepoId) {
      return;
    }

    setRenamingRepoId(repoId);
    setAddRepoError(null);
    try {
      const renamed = await renameRepo(selectedProject.id, repoId, editingRepoName);
      setProjects((state) =>
        state.map((project) =>
          project.id === selectedProject.id
            ? {
                ...project,
                repos: project.repos.map((repo) => (repo.id === repoId ? { ...repo, name: renamed.name } : repo))
              }
            : project
        )
      );
      setEditingRepoId(null);
      setEditingRepoName('');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAddRepoError(message || 'Failed to rename repository.');
    } finally {
      setRenamingRepoId(null);
    }
  };

  const handleDeleteRepo = async (repoId: string) => {
    if (!selectedProject || deletingRepoId) {
      return;
    }

    const repo = selectedProject.repos.find((entry) => entry.id === repoId);
    const confirmed = window.confirm(`Delete repo "${repo?.name ?? repoId}" from this project?`);
    if (!confirmed) {
      return;
    }

    setDeletingRepoId(repoId);
    setAddRepoError(null);
    try {
      await deleteRepo(selectedProject.id, repoId);
      setProjects((state) =>
        state.map((project) =>
          project.id === selectedProject.id
            ? { ...project, repos: project.repos.filter((repoEntry) => repoEntry.id !== repoId) }
            : project
        )
      );
      if (editingRepoId === repoId) {
        setEditingRepoId(null);
        setEditingRepoName('');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAddRepoError(message || 'Failed to delete repository.');
    } finally {
      setDeletingRepoId(null);
    }
  };

  const handleResetState = async () => {
    if (stateAction) {
      return;
    }
    const confirmed = window.confirm('Reset all persisted projects/repos/sessions state?');
    if (!confirmed) {
      return;
    }
    setStateAction('reset');
    setStateActionError(null);
    try {
      await resetPersistedState();
      await reloadProjects();
      setShowAddRepoForm(false);
      resetOnboardingFlow();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStateActionError(message || 'Failed to reset persisted state.');
    } finally {
      setStateAction(null);
    }
  };

  const handleRestoreState = async () => {
    if (stateAction) {
      return;
    }
    setStateAction('restore');
    setStateActionError(null);
    try {
      await restoreStateFromBackup();
      await reloadProjects();
      setShowAddRepoForm(false);
      resetOnboardingFlow();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStateActionError(message || 'Failed to restore state backup.');
    } finally {
      setStateAction(null);
    }
  };

  return (
    <div className="relative flex h-screen min-h-[700px] bg-bgBase">
      {view === 'home' ? (
        <>
          <Sidebar
            header={<Logo size="sm" />}
            footer={
              <Button variant="secondary" className="w-full" aria-label="Create new project" onClick={openNewProjectFlow}>
                + New Project
              </Button>
            }
          >
            <nav className="space-y-1" aria-label="Project list">
              {projects.map((project) => (
                <ProjectItem
                  key={project.id}
                  project={{ id: project.id, name: project.name, repos: project.repos.length }}
                  selected={project.id === selectedProject?.id}
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setInitialChatSessionId(undefined);
                  }}
                />
              ))}
              {!loadingProjects && projects.length === 0 ? <p className="px-2 py-1 text-xs text-textDisabled">No projects yet.</p> : null}
            </nav>
          </Sidebar>

          <main className="flex-1 overflow-y-auto p-5">
            {projectsError ? <p className="mb-4 text-xs text-red-300">{projectsError}</p> : null}
            {stateActionError ? <p className="mb-4 text-xs text-red-300">{stateActionError}</p> : null}
            {loadingProjects ? <p className="text-xs text-textSecondary">Loading projects...</p> : null}

            {!loadingProjects && !selectedProject ? (
              <div className="max-w-xl rounded-md border border-borderDefault bg-bgSurface p-5">
                <h1 className="text-base font-semibold text-textPrimary">No projects yet</h1>
                <p className="mt-1 text-xs text-textSecondary">Create your first project to bootstrap a chat session.</p>
                <div className="mt-4">
                  <Button size="sm" onClick={openNewProjectFlow}>
                    Create your first project
                  </Button>
                </div>
                <div className="mt-4 border-t border-borderDefault pt-4">
                  <p className="mb-2 text-xs text-textSecondary">Recovery tools</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" loading={stateAction === 'restore'} onClick={handleRestoreState}>
                      Restore Backup
                    </Button>
                    <Button size="sm" variant="ghost" loading={stateAction === 'reset'} onClick={handleResetState}>
                      Reset State
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {!loadingProjects && selectedProject ? (
              <section className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {editingProjectTitle ? (
                        <>
                          <input
                            type="text"
                            value={projectNameDraft}
                            onChange={(event) => setProjectNameDraft(event.target.value)}
                            className="h-8 min-w-[260px] rounded-sm border border-borderStrong bg-bgSurface px-2 text-sm text-textPrimary outline-none focus:border-accent"
                            placeholder="Project name"
                            aria-label="Project name"
                          />
                          <Button
                            size="sm"
                            loading={renamingProject}
                            onClick={async () => {
                              const renamed = await handleRenameProject();
                              if (renamed) {
                                setEditingProjectTitle(false);
                              }
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setProjectNameDraft(selectedProject.name);
                              setEditingProjectTitle(false);
                            }}
                            disabled={renamingProject}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <h1 className="truncate text-lg font-semibold text-textPrimary">{selectedProject.name}</h1>
                          <button
                            type="button"
                            onClick={() => setEditingProjectTitle(true)}
                            disabled={deletingProject}
                            aria-label="Edit project name"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-textDisabled transition-colors hover:bg-bgSubtle hover:text-textSecondary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteProject}
                            disabled={deletingProject || renamingProject}
                            aria-label="Delete project"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-error transition-colors hover:bg-[var(--color-error-subtle)] hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setInitialChatSessionId(undefined);
                        onViewChange('chat');
                      }}
                    >
                      Open Chat
                    </Button>
                  </div>
                  <p className="text-xs text-textDisabled">
                    {selectedProject.repos.length} repos · {selectedProject.sessions.length} sessions
                  </p>
                </div>

                <div className="rounded-md py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-textDisabled">Repos</h2>
                    <Button size="sm" variant="secondary" onClick={() => setShowAddRepoForm((state) => !state)}>
                      {showAddRepoForm ? 'Close' : 'Add Repo'}
                    </Button>
                  </div>
                  {showAddRepoForm ? (
                    <div className="mb-3 rounded-sm border border-borderDefault bg-bgElevated p-3">
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newRepoName}
                          onChange={(event) => {
                            setNewRepoName(event.target.value);
                            if (addRepoError) {
                              setAddRepoError(null);
                            }
                          }}
                          className="h-8 w-full rounded-sm border border-borderStrong bg-bgSurface px-2 text-xs text-textPrimary outline-none focus:border-accent"
                          placeholder="Repository name (e.g. backend)"
                          aria-label="Repository name"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newRepoPath}
                            onChange={(event) => {
                              setNewRepoPath(event.target.value);
                              if (addRepoError) {
                                setAddRepoError(null);
                              }
                            }}
                            className="h-8 flex-1 rounded-sm border border-borderStrong bg-bgSurface px-2 text-xs text-textPrimary outline-none focus:border-accent"
                            placeholder="Local path (e.g. /Users/you/my-repo)"
                            aria-label="Repository local path"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={pickingRepoFolder}
                            onClick={handlePickRepoFolder}
                            aria-label="Browse for repository folder"
                          >
                            Browse
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" loading={addingRepo} onClick={handleAddRepo}>
                            Save Repo
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowAddRepoForm(false);
                              setNewRepoName('');
                              setNewRepoPath('');
                              setAddRepoError(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        {addRepoError ? <p className="text-[10px] text-red-300">{addRepoError}</p> : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-2 text-xs text-textSecondary">
                    {selectedProject.repos.map((repo) => (
                      <div key={repo.id} className="rounded-sm">
                        {editingRepoId === repo.id ? (
                          <div className="space-y-2 rounded-sm border border-borderDefault bg-bgElevated px-3 py-2">
                            <input
                              type="text"
                              value={editingRepoName}
                              onChange={(event) => setEditingRepoName(event.target.value)}
                              className="h-8 w-full rounded-sm border border-borderStrong bg-bgSurface px-2 text-xs text-textPrimary outline-none focus:border-accent"
                              aria-label={`Rename ${repo.name}`}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" loading={renamingRepoId === repo.id} onClick={() => handleRenameRepo(repo.id)}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingRepoId(null);
                                  setEditingRepoName('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 rounded-sm border border-borderDefault bg-bgSurface px-3 py-2 text-xs">
                            <FontAwesomeIcon icon={faFolderRegular} className="h-3.5 w-3.5 shrink-0 text-textSecondary" />
                            <p className="shrink-0 text-base font-semibold text-textPrimary">{repo.name}</p>
                            <p className="min-w-0 flex-1 truncate text-left font-mono text-textDisabled">{repo.localPath}</p>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-borderStrong bg-bgSubtle px-2 py-1 font-mono text-[11px] text-textPrimary">
                              <FontAwesomeIcon icon={faCodeBranch} className="h-3 w-3" />
                              {repo.lastBranchRead}
                            </span>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRepoId(repo.id);
                                  setEditingRepoName(repo.name);
                                }}
                                aria-label={`Rename ${repo.name}`}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-textDisabled transition-colors hover:bg-bgSubtle hover:text-textTertiary"
                              >
                                <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRepo(repo.id)}
                                disabled={deletingRepoId === repo.id}
                                aria-label={`Remove ${repo.name}`}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-error transition-colors hover:bg-[var(--color-error-subtle)] hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedProject.repos.length === 0 ? (
                      <div className="rounded-sm border border-borderDefault bg-bgElevated px-3 py-2 text-textDisabled">
                        No repositories connected yet.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-md py-4">
                  <div className="mb-3 flex items-center">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-textDisabled">Recent Sessions</h2>
                  </div>
                  <div className="space-y-2 text-xs text-textSecondary">
                    {selectedProject.sessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          setInitialChatSessionId(session.id);
                          onViewChange('chat');
                        }}
                        className="flex w-full items-center gap-3 rounded-sm border border-borderDefault bg-bgSurface px-3 py-2 text-left transition-colors hover:bg-bgSubtle"
                      >
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-textPrimary">{session.name}</p>
                        <span
                          className="inline-flex shrink-0 items-center rounded-sm border px-2 py-1 text-[11px] font-medium"
                          style={getRolePillStyle(session.role)}
                        >
                          {session.role}
                        </span>
                        <span className="shrink-0 text-[11px] text-textDisabled">{formatSessionTimestamp(session.updatedAt)}</span>
                      </button>
                    ))}
                    {selectedProject.sessions.length === 0 ? (
                      <div className="rounded-sm border border-borderDefault bg-bgElevated px-3 py-2 text-textDisabled">No sessions yet.</div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-md py-4">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-textDisabled">State Recovery</h2>
                  <div className="rounded-sm border border-borderDefault bg-bgSurface px-3 py-3">
                    <p className="mb-3 text-xs text-textSecondary">Use these if persistence is corrupted or you want a clean slate.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" loading={stateAction === 'restore'} onClick={handleRestoreState}>
                        Restore Backup
                      </Button>
                      <Button size="sm" variant="ghost" loading={stateAction === 'reset'} onClick={handleResetState}>
                        Reset State
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </main>
        </>
      ) : (
        <main className="flex min-h-0 flex-1 overflow-hidden">
          {projectsError ? <p className="absolute left-5 top-5 z-[var(--z-sticky)] text-xs text-red-300">{projectsError}</p> : null}
          {loadingProjects ? <p className="absolute left-5 top-5 z-[var(--z-sticky)] text-xs text-textSecondary">Loading projects...</p> : null}

          {!loadingProjects && selectedProject ? (
            <section className="flex min-h-0 flex-1">
              <ChatWindow
                key={`${selectedProject.id}-${initialChatSessionId ?? 'default'}`}
                project={selectedProject}
                initialSessionId={initialChatSessionId}
                onProjectSessionsChange={handleProjectSessionsChange}
                onClose={() => onViewChange('home')}
              />
            </section>
          ) : null}

          {!loadingProjects && !selectedProject ? (
            <div className="m-5 max-w-xl rounded-md border border-borderDefault bg-bgSurface p-5">
              <h1 className="text-base font-semibold text-textPrimary">No project selected</h1>
              <p className="mt-1 text-xs text-textSecondary">Return to Home to pick or create a project.</p>
              <div className="mt-4">
                <Button size="sm" onClick={() => onViewChange('home')}>
                  Back to Home
                </Button>
              </div>
            </div>
          ) : null}
        </main>
      )}

      {onboardingOpen ? (
        <div className="absolute inset-0 z-[var(--z-modal)] flex items-center justify-center bg-bgBase/85 p-6">
          <section className="w-full max-w-2xl rounded-lg border border-borderDefault bg-bgSurface p-6">
            <div className="mb-5 text-center">
              <h2 className="text-base font-semibold text-textPrimary">New Project</h2>
            </div>

            <div className="relative mb-8 px-3">
              <div className="absolute left-7 right-7 top-4 h-px bg-borderDefault" />
              <div className="relative flex items-start justify-between">
                {onboardingSteps.map((step, index) => {
                  const active = onboardingStep === step.id;
                  const done = onboardingStepIndex > index;

                  return (
                    <div key={step.id} className="flex w-8 flex-col items-center">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          active
                            ? 'border-success bg-success text-bgBase'
                            : done
                              ? 'border-success bg-[var(--color-success-subtle)] text-success'
                              : 'border-borderDefault bg-bgSurface text-textDisabled'
                        }`}
                      >
                        <FontAwesomeIcon icon={done ? faCheck : step.icon} className="h-3 w-3" />
                      </span>
                      <span className={`mt-2 w-20 text-center text-xs ${active ? 'text-textPrimary' : done ? 'text-textSecondary' : 'text-textDisabled'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {onboardingStep === 'name' ? (
              <div className="space-y-3">
                <label className="block text-xs text-textSecondary" htmlFor="onboarding-project-name">
                  Project name
                </label>
                <input
                  id="onboarding-project-name"
                  type="text"
                  value={onboardingProjectName}
                  onChange={(event) => {
                    setOnboardingProjectName(event.target.value);
                    if (onboardingError) {
                      setOnboardingError(null);
                    }
                  }}
                  className="h-10 w-full rounded-sm border border-borderStrong bg-bgElevated px-3 text-sm text-textPrimary outline-none focus:border-accent"
                  placeholder="My Solution"
                  aria-label="Project name"
                />
                <p className="text-xs text-textTertiary">This is your local name for this solution.</p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={cancelNewProjectFlow} disabled={onboardingBusy}>
                    Cancel
                  </Button>
                  <Button loading={onboardingBusy} onClick={handleOnboardingNameContinue} disabled={!isProjectNameValid(onboardingProjectName)}>
                    Continue
                  </Button>
                </div>
              </div>
            ) : null}

            {onboardingStep === 'repos' ? (
              <div className="space-y-4">
                <p className="text-xs text-textSecondary">
                  Point Agent 42 to the local folders where your repositories are checked out.
                </p>
                <div className="rounded-md border border-borderDefault bg-bgElevated p-3">
                  <Button size="sm" variant="secondary" loading={onboardingBusy} onClick={handleOnboardingAddRepo}>
                    Add Repository
                  </Button>
                  <div className="mt-3 space-y-2">
                    {onboardingRepos.map((repo) => (
                      <div key={repo.id} className="flex items-center gap-3 rounded-sm border border-borderDefault bg-bgSurface px-3 py-2 text-xs">
                        <FontAwesomeIcon icon={faFolderRegular} className="h-3.5 w-3.5 shrink-0 text-textSecondary" />
                        <p className="shrink-0 text-base font-semibold text-textPrimary">{repo.name}</p>
                        <p className="min-w-0 flex-1 truncate text-left font-mono text-textDisabled">{repo.localPath}</p>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-borderStrong bg-bgSubtle px-2 py-1 font-mono text-[11px] text-textPrimary">
                          <FontAwesomeIcon icon={faCodeBranch} className="h-3 w-3" />
                          {repo.lastBranchRead}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOnboardingRemoveRepo(repo.id)}
                          disabled={onboardingBusy}
                          aria-label={`Remove ${repo.name}`}
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-textTertiary transition-colors hover:bg-bgSubtle hover:text-textPrimary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {onboardingRepos.length === 0 ? (
                      <div className="rounded-sm border border-dashed border-borderStrong px-3 py-6 text-center text-xs text-textDisabled">
                        No repositories added yet.
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex justify-between gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOnboardingStep(getOnboardingBackStep('repos'));
                      setOnboardingError(null);
                    }}
                    disabled={onboardingBusy}
                  >
                    Back
                  </Button>
                  <Button onClick={handleOnboardingReposContinue} disabled={!canContinueFromRepoStep(onboardingRepos.length) || onboardingBusy}>
                    Continue
                  </Button>
                </div>
              </div>
            ) : null}

            {onboardingStep === 'done' ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center">
                  <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-success bg-[var(--color-success-subtle)] text-success">
                    <FontAwesomeIcon icon={faCheck} className="h-6 w-6" />
                  </span>
                  <h3 className="text-xl font-bold text-textPrimary">{onboardingDoneSummary.projectName}</h3>
                  <p className="mt-1 text-sm text-textSecondary">{onboardingDoneSummary.repoCountText}</p>
                </div>
                <div className="mt-6 space-y-2 rounded-md border border-borderDefault bg-bgElevated p-3">
                  {onboardingDoneSummary.repos.map((repo) => (
                    <div key={repo.id} className="flex items-center gap-2 text-sm text-textPrimary">
                      <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 shrink-0 text-success" />
                      <span className="font-semibold">{repo.name}</span>
                      <span className="font-mono text-xs text-textDisabled">{repo.lastBranchRead}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOnboardingStep(getOnboardingBackStep('done'));
                      setOnboardingError(null);
                    }}
                    disabled={onboardingBusy}
                  >
                    Back
                  </Button>
                  <Button loading={onboardingBusy} onClick={handleOnboardingOpenChat}>
                    Open Chat
                  </Button>
                </div>
              </div>
            ) : null}

            {onboardingError ? <p className="mt-3 text-xs text-red-300">{onboardingError}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
