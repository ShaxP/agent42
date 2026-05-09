import { SidebarItem } from './SidebarItem';

interface ProjectItemProps {
  project: { id: string; name: string; repos: number };
  selected?: boolean;
  onClick?: () => void;
}

export function ProjectItem({ project, selected, onClick }: ProjectItemProps) {
  return <SidebarItem label={project.name} count={project.repos} selected={selected} onClick={onClick} />;
}
