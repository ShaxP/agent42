import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { ProjectItem } from '../components/layout/ProjectItem';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import {
  createProject,
  createRepo,
  deleteProject,
  deleteRepo,
  getProjectList,
  pickRepoFolder,
  renameProject,
  renameRepo,
  resetPersistedState,
  restoreStateFromBackup
} from '../lib/tauri';
import type { Project } from '../types';
import { ChatWindow } from './ChatWindow';

interface HomeProps {
  view: 'home' | 'chat';
  onViewChange: (view: 'home' | 'chat') => void;
}

export function Home({ view, onViewChange }: HomeProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingProjectName, setCreatingProjectName] = useState('');
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddRepoForm, setShowAddRepoForm] = useState(false);
  const [addingRepo, setAddingRepo] = useState(false);
  const [pickingRepoFolder, setPickingRepoFolder] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPath, setNewRepoPath] = useState('');
  const [addRepoError, setAddRepoError] = useState<string | null>(null);
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [renamingProject, setRenamingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [editingRepoId, setEditingRepoId] = useState<string | null>(null);
  const [editingRepoName, setEditingRepoName] = useState('');
  const [renamingRepoId, setRenamingRepoId] = useState<string | null>(null);
  const [deletingRepoId, setDeletingRepoId] = useState<string | null>(null);
  const [stateAction, setStateAction] = useState<'reset' | 'restore' | null>(null);
  const [stateActionError, setStateActionError] = useState<string | null>(null);

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

  useEffect(() => {
    setProjectNameDraft(selectedProject?.name ?? '');
  }, [selectedProject?.id, selectedProject?.name]);

  const handleCreateProject = async () => {
    if (creatingProject) {
      return;
    }

    const name = creatingProjectName.trim();
    if (!name) {
      setCreateProjectError('Project name is required.');
      return;
    }

    setCreatingProject(true);
    setCreateProjectError(null);
    try {
      const created = await createProject(name);
      setProjects((state) => [created, ...state]);
      setSelectedProjectId(created.id);
      setCreatingProjectName('');
      setShowCreateForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCreateProjectError(message || 'Failed to create project.');
    } finally {
      setCreatingProject(false);
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

  const handleRenameProject = async () => {
    if (!selectedProject || renamingProject) {
      return;
    }

    setRenamingProject(true);
    setProjectsError(null);
    try {
      const renamed = await renameProject(selectedProject.id, projectNameDraft);
      setProjects((state) => state.map((project) => (project.id === renamed.id ? { ...project, name: renamed.name } : project)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setProjectsError(message || 'Failed to rename project.');
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

  const reloadProjects = async () => {
    const loadedProjects = await getProjectList();
    setProjects(loadedProjects);
    setSelectedProjectId(loadedProjects[0]?.id);
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
      setShowCreateForm(false);
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
      setShowCreateForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStateActionError(message || 'Failed to restore state backup.');
    } finally {
      setStateAction(null);
    }
  };

  return (
    <div className="flex h-screen min-h-[700px] bg-bgBase">
      <Sidebar
        header={<Logo size="sm" />}
        footer={
          showCreateForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={creatingProjectName}
                onChange={(event) => {
                  setCreatingProjectName(event.target.value);
                  if (createProjectError) {
                    setCreateProjectError(null);
                  }
                }}
                className="h-8 w-full rounded-sm border border-borderStrong bg-bgSurface px-2 text-xs text-textPrimary outline-none focus:border-accent"
                placeholder="Project name"
                aria-label="New project name"
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" loading={creatingProject} onClick={handleCreateProject}>
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreatingProjectName('');
                    setCreateProjectError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
              {createProjectError ? <p className="text-[10px] text-red-300">{createProjectError}</p> : null}
            </div>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              aria-label="Create new project"
              onClick={() => setShowCreateForm(true)}
            >
              + New Project
            </Button>
          )
        }
      >
        <nav className="space-y-1" aria-label="Project list">
          {projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={{ id: project.id, name: project.name, repos: project.repos.length }}
              selected={project.id === selectedProject?.id}
              onClick={() => setSelectedProjectId(project.id)}
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
            <h1 className="text-base font-semibold text-textPrimary">Welcome to Agent 42</h1>
            <p className="mt-1 text-xs text-textSecondary">No project data is preloaded anymore. Start by creating your first project.</p>
            <ol className="mt-4 space-y-2 text-xs text-textSecondary">
              <li>1. Create a project from the left sidebar.</li>
              <li>2. Add one or more local Git repositories to that project.</li>
              <li>3. Open Chat and start a session.</li>
            </ol>
            <div className="mt-4">
              <Button
                size="sm"
                onClick={() => {
                  setShowCreateForm(true);
                  onViewChange('home');
                }}
              >
                Create First Project
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
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-textPrimary">{selectedProject.name}</h1>
                <p className="text-xs text-textSecondary">
                  {selectedProject.repos.length} repos · {selectedProject.sessions.length} sessions
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant={view === 'home' ? 'secondary' : 'ghost'} size="sm" onClick={() => onViewChange('home')}>
                  Home
                </Button>
                <Button variant={view === 'chat' ? 'secondary' : 'ghost'} size="sm" onClick={() => onViewChange('chat')}>
                  Chat
                </Button>
              </div>
            </div>

            {view === 'home' ? (
              <section className="space-y-4">
                <div className="rounded-md border border-borderDefault bg-bgSurface p-4">
                  <h2 className="mb-3 text-sm font-medium text-textPrimary">Project Settings</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={projectNameDraft}
                      onChange={(event) => setProjectNameDraft(event.target.value)}
                      className="h-8 min-w-[260px] flex-1 rounded-sm border border-borderStrong bg-bgSurface px-2 text-xs text-textPrimary outline-none focus:border-accent"
                      placeholder="Project name"
                      aria-label="Project name"
                    />
                    <Button size="sm" loading={renamingProject} onClick={handleRenameProject}>
                      Rename
                    </Button>
                    <Button size="sm" variant="ghost" loading={deletingProject} onClick={handleDeleteProject}>
                      Delete Project
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-borderDefault bg-bgSurface p-4">
                  <h2 className="mb-2 text-sm font-medium text-textPrimary">State Recovery</h2>
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

                <div className="rounded-md border border-borderDefault bg-bgSurface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-textPrimary">Repos</h2>
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
                      <div key={repo.id} className="rounded-sm border border-borderDefault bg-bgElevated px-3 py-2">
                        {editingRepoId === repo.id ? (
                          <div className="space-y-2">
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
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">
                              {repo.name} · {repo.localPath} · {repo.lastBranchRead}
                            </span>
                            <div className="flex shrink-0 gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingRepoId(repo.id);
                                  setEditingRepoName(repo.name);
                                }}
                              >
                                Rename
                              </Button>
                              <Button size="sm" variant="ghost" loading={deletingRepoId === repo.id} onClick={() => handleDeleteRepo(repo.id)}>
                                Remove
                              </Button>
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

                <div className="rounded-md border border-borderDefault bg-bgSurface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-textPrimary">Recent Sessions</h2>
                    <Button size="sm" onClick={() => onViewChange('chat')}>
                      Open Chat
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs text-textSecondary">
                    {selectedProject.sessions.map((session) => (
                      <div key={session.id} className="rounded-sm border border-borderDefault bg-bgElevated px-3 py-2">
                        {session.name} · {session.role} · {new Date(session.updatedAt).toLocaleDateString()}
                      </div>
                    ))}
                    {selectedProject.sessions.length === 0 ? (
                      <div className="rounded-sm border border-borderDefault bg-bgElevated px-3 py-2 text-textDisabled">
                        No sessions yet.
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : (
              <ChatWindow key={selectedProject.id} project={selectedProject} />
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
