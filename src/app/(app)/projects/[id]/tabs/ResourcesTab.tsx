"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { FileText, Download, Trash2, FolderOpen } from "lucide-react";

interface TaskFile {
  id: string; name: string; url: string; size: number; mimeType?: string | null; createdAt: string;
  uploadedBy: { id: string; name: string };
  task: { id: string; name: string; milestone: { name: string } };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function ResourcesTab({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/files`)
      .then((r) => r.json())
      .then((data) => { setFiles(data); setLoading(false); });
  }, [projectId]);

  async function deleteFile(id: string) {
    if (!confirm("Supprimer ce fichier ?")) return;
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
    if (res.ok) setFiles((f) => f.filter((file) => file.id !== id));
  }

  if (loading) return <div className="p-6 text-gray-400 text-sm">Chargement...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="w-5 h-5 text-gray-400" />
        <h2 className="font-semibold text-gray-900">Ressources du projet</h2>
        <span className="text-sm text-gray-400">({files.length} fichier{files.length !== 1 ? "s" : ""})</span>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucun fichier pour l'instant</p>
          <p className="text-gray-300 text-xs mt-1">Ajoutez des fichiers depuis le panneau d'une tâche</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {files.map((file, i) => (
            <div key={file.id} className={`flex items-center gap-4 px-5 py-3 ${i < files.length - 1 ? "border-b border-gray-100" : ""} hover:bg-gray-50 group`}>
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{file.task.milestone.name} → {file.task.name}</span>
                  <span>•</span>
                  <span>{formatSize(file.size)}</span>
                  <span>•</span>
                  <span>{file.uploadedBy.name}</span>
                  <span>•</span>
                  <span>{formatDate(file.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={file.url} target="_blank" rel="noreferrer"
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Télécharger">
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => deleteFile(file.id)}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
