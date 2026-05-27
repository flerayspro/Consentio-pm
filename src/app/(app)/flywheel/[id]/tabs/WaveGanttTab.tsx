"use client";

import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { useState } from "react";

interface WaveTask {
  id: string; name: string; status: string;
  startDate?: Date | null; dueDate: Date; order: number;
}

interface WaveMilestone {
  id: string; name: string; status: string;
  startDate?: Date | null; dueDate: Date; order: number;
  tasks: WaveTask[];
}

function toGanttTasks(milestones: WaveMilestone[], waveStart: Date, waveEnd: Date): Task[] {
  const tasks: Task[] = [];

  for (const milestone of milestones) {
    const taskDates = milestone.tasks.map((t) => new Date(t.dueDate).getTime());
    const mEnd = new Date(milestone.dueDate);
    const mStart = milestone.startDate
      ? new Date(milestone.startDate)
      : taskDates.length > 0
        ? new Date(Math.min(...taskDates))
        : mEnd;

    // La milestone ne peut pas commencer après sa fin
    const safeStart = mStart <= mEnd ? mStart : new Date(mEnd.getTime() - 86400000);

    tasks.push({
      id: `milestone-${milestone.id}`,
      name: milestone.name,
      start: safeStart,
      end: mEnd,
      type: "project",
      progress:
        milestone.tasks.length > 0
          ? Math.round(
              (milestone.tasks.filter((t) => t.status === "DONE").length /
                milestone.tasks.length) *
                100
            )
          : 0,
      isDisabled: true,
      styles: {
        progressColor: milestone.status === "DONE" ? "#22c55e" : "#10b981",
        progressSelectedColor: milestone.status === "DONE" ? "#16a34a" : "#059669",
        backgroundColor: milestone.status === "DONE" ? "#dcfce7" : "#d1fae5",
        backgroundSelectedColor: milestone.status === "DONE" ? "#bbf7d0" : "#a7f3d0",
      },
    });

    for (const task of milestone.tasks) {
      const taskEnd = new Date(task.dueDate);
      const taskStart = task.startDate ? new Date(task.startDate) : new Date(safeStart);

      // Assure au moins 1 jour de durée
      if (taskStart.getTime() >= taskEnd.getTime()) {
        taskStart.setDate(taskEnd.getDate() - 1);
      }

      tasks.push({
        id: `task-${task.id}`,
        name: task.name,
        start: taskStart,
        end: taskEnd,
        type: "task",
        progress:
          task.status === "DONE" ? 100 : task.status === "IN_PROGRESS" ? 50 : 0,
        dependencies: [`milestone-${milestone.id}`],
        isDisabled: true,
        styles: {
          progressColor:
            task.status === "DONE"
              ? "#22c55e"
              : task.status === "IN_PROGRESS"
                ? "#f59e0b"
                : "#94a3b8",
          progressSelectedColor:
            task.status === "DONE" ? "#16a34a" : "#d97706",
          backgroundColor:
            task.status === "DONE"
              ? "#dcfce7"
              : task.status === "IN_PROGRESS"
                ? "#fef3c7"
                : "#f1f5f9",
          backgroundSelectedColor: "#e2e8f0",
        },
      });
    }
  }

  if (tasks.length === 0) {
    return [
      {
        id: "placeholder",
        name: "Aucune tâche",
        start: new Date(waveStart),
        end: new Date(waveEnd),
        type: "project",
        progress: 0,
        isDisabled: true,
      },
    ];
  }

  return tasks;
}

export function WaveGanttTab({
  milestones,
  waveStart,
  waveEnd,
}: {
  milestones: WaveMilestone[];
  waveStart: Date;
  waveEnd: Date;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const ganttTasks = toGanttTasks(milestones, new Date(waveStart), new Date(waveEnd));

  return (
    <div className="p-6">
      {/* Contrôles */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-gray-900">Planning de la vague</h2>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          {([ViewMode.Day, ViewMode.Week, ViewMode.Month] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {mode === ViewMode.Day
                ? "Jour"
                : mode === ViewMode.Week
                  ? "Semaine"
                  : "Mois"}
            </button>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500">
        {[
          { color: "bg-emerald-200", label: "Milestone en cours" },
          { color: "bg-green-200",   label: "Milestone terminée" },
          { color: "bg-yellow-200",  label: "Tâche en cours" },
          { color: "bg-green-200",   label: "Tâche terminée" },
          { color: "bg-gray-200",    label: "Tâche à faire" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Gantt */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          listCellWidth="200px"
          columnWidth={
            viewMode === ViewMode.Month ? 200 : viewMode === ViewMode.Week ? 120 : 60
          }
          locale="fr-FR"
          todayColor="rgba(16, 185, 129, 0.1)"
        />
      </div>
    </div>
  );
}
