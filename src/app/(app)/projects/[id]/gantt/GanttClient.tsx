"use client";

import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";

interface TaskData {
  id: string; name: string; status: string;
  dueDate: Date; order: number;
}
interface MilestoneData {
  id: string; name: string; status: string;
  dueDate: Date; order: number; tasks: TaskData[];
}
interface ProjectData {
  id: string; name: string;
  startDate: Date; endDate: Date;
  milestones: MilestoneData[];
}

function toGanttTasks(project: ProjectData): Task[] {
  const tasks: Task[] = [];
  const projectStart = new Date(project.startDate);
  const projectEnd = new Date(project.endDate);

  for (const milestone of project.milestones) {
    const mStart = milestone.tasks.length > 0
      ? new Date(Math.min(...milestone.tasks.map((t) => new Date(t.dueDate).getTime())))
      : projectStart;
    const mEnd = new Date(milestone.dueDate);

    tasks.push({
      id: `milestone-${milestone.id}`,
      name: milestone.name,
      start: mStart > mEnd ? mEnd : mStart,
      end: mEnd < projectStart ? projectStart : mEnd,
      type: "project",
      progress: milestone.tasks.length > 0
        ? Math.round((milestone.tasks.filter((t) => t.status === "DONE").length / milestone.tasks.length) * 100)
        : 0,
      isDisabled: true,
      styles: {
        progressColor: milestone.status === "DONE" ? "#22c55e" : "#3b82f6",
        progressSelectedColor: milestone.status === "DONE" ? "#16a34a" : "#2563eb",
        backgroundColor: milestone.status === "DONE" ? "#dcfce7" : "#dbeafe",
        backgroundSelectedColor: milestone.status === "DONE" ? "#bbf7d0" : "#bfdbfe",
      },
    });

    for (const task of milestone.tasks) {
      const taskEnd = new Date(task.dueDate);
      const taskStart = new Date(taskEnd);
      taskStart.setDate(taskStart.getDate() - 1);

      tasks.push({
        id: `task-${task.id}`,
        name: task.name,
        start: taskStart,
        end: taskEnd,
        type: "task",
        progress: task.status === "DONE" ? 100 : task.status === "IN_PROGRESS" ? 50 : 0,
        dependencies: [`milestone-${milestone.id}`],
        isDisabled: true,
        styles: {
          progressColor: task.status === "DONE" ? "#22c55e" : task.status === "IN_PROGRESS" ? "#f59e0b" : "#94a3b8",
          progressSelectedColor: task.status === "DONE" ? "#16a34a" : "#d97706",
          backgroundColor: task.status === "DONE" ? "#dcfce7" : task.status === "IN_PROGRESS" ? "#fef3c7" : "#f1f5f9",
          backgroundSelectedColor: "#e2e8f0",
        },
      });
    }
  }

  return tasks.length > 0 ? tasks : [{
    id: "placeholder",
    name: project.name,
    start: projectStart,
    end: projectEnd,
    type: "project",
    progress: 0,
    isDisabled: true,
  }];
}

export function GanttClient({ project }: { project: ProjectData }) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const ganttTasks = toGanttTasks(project);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${project.id}`}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">Vue Gantt</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          {([ViewMode.Day, ViewMode.Week, ViewMode.Month] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {mode === ViewMode.Day ? "Jour" : mode === ViewMode.Week ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        {[
          { color: "bg-blue-200", label: "Milestone en cours" },
          { color: "bg-green-200", label: "Milestone terminée" },
          { color: "bg-yellow-200", label: "Tâche en cours" },
          { color: "bg-green-200", label: "Tâche terminée" },
          { color: "bg-gray-200", label: "Tâche à faire" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {ganttTasks.length > 0 ? (
          <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            listCellWidth="200px"
            columnWidth={viewMode === ViewMode.Month ? 200 : viewMode === ViewMode.Week ? 120 : 60}
            locale="fr-FR"
            todayColor="rgba(59, 130, 246, 0.1)"
          />
        ) : (
          <div className="text-center py-16 text-gray-400">
            Aucune tâche à afficher dans le Gantt
          </div>
        )}
      </div>
    </div>
  );
}
