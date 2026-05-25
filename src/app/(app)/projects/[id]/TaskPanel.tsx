"use client";

import { useEffect, useState, useRef } from "react";
import { formatDate } from "@/lib/utils";
import {
  X, Calendar, User, Send, Trash2, Paperclip, Download,
  FileText, CheckCircle2, Clock, Circle,
} from "lucide-react";

interface Comment { id: string; content: string; createdAt: string; author: { id: string; name: string }; }
interface TaskFileItem { id: string; name: string; url: string; size: number; mimeType?: string | null; createdAt: string; uploadedBy: { id: string; name: string }; }
interface TaskDetail {
  id: string; name: string; description?: string | null; status: string;
  dueDate: string; owner?: { id: string; name: string } | null;
  comments: Comment[]; files: TaskFileItem[];
}
interface UserItem { id: string; name: string; role: string; }

const STATUS_OPTIONS = [
  { value: "TODO", label: "À faire", icon: <Circle className="w-3.5 h-3.5 text-gray-400" /> },
  { value: "IN_PROGRESS", label: "En cours", icon: <Clock className="w-3.5 h-3.5 text-blue-500" /> },
  { value: "DONE", label: "Terminé", icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> },
];

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface Props {
  taskId: string;
  users: UserItem[];
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
  onUpdate: (task: Partial<TaskDetail>) => void;
}

export function TaskPanel({ taskId, users, currentUserId, currentUserRole, onClose, onUpdate }: Props) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editOwnerId, setEditOwnerId] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((data) => {
        setTask(data);
        setEditName(data.name);
        setEditDesc(data.description ?? "");
        setEditDueDate(data.dueDate ? data.dueDate.slice(0, 10) : "");
        setEditOwnerId(data.owner?.id ?? "");
        setEditStatus(data.status);
        setLoading(false);
      });
  }, [taskId]);

  async function saveField(field: string, value: string) {
    setSaving(true);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || undefined }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTask((prev) => prev ? { ...prev, ...updated } : prev);
      onUpdate(updated);
    }
    setSaving(false);
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSendingComment(true);
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment.trim() }),
    });
    if (res.ok) {
      const c = await res.json();
      setTask((prev) => prev ? { ...prev, comments: [...prev.comments, c] } : prev);
      setComment("");
    }
    setSendingComment(false);
  }

  async function deleteComment(id: string) {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) setTask((prev) => prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== id) } : prev);
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/tasks/${taskId}/files`, { method: "POST", body: fd });
    if (res.ok) {
      const f = await res.json();
      setTask((prev) => prev ? { ...prev, files: [f, ...prev.files] } : prev);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deleteFile(id: string) {
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
    if (res.ok) setTask((prev) => prev ? { ...prev, files: prev.files.filter((f) => f.id !== id) } : prev);
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white border-l border-gray-200 z-40 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Détail de la tâche</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading || !task ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Chargement...</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Nom */}
            <div className="px-5 pt-4 pb-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => editName !== task.name && saveField("name", editName)}
                className="w-full text-lg font-bold text-gray-900 border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none pb-1 transition-colors"
              />
            </div>

            {/* Champs */}
            <div className="px-5 py-3 grid grid-cols-2 gap-3 border-b border-gray-100">
              {/* Statut */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Statut</label>
                <select value={editStatus}
                  onChange={(e) => { setEditStatus(e.target.value); saveField("status", e.target.value); }}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Échéance */}
              <div>
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Échéance</label>
                <input type="date" value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  onBlur={() => editDueDate && saveField("dueDate", editDueDate)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Owner */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" />Responsable</label>
                <select value={editOwnerId}
                  onChange={(e) => { setEditOwnerId(e.target.value); saveField("ownerId", e.target.value); }}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Non assigné</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="px-5 py-3 border-b border-gray-100">
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onBlur={() => editDesc !== (task.description ?? "") && saveField("description", editDesc)}
                rows={3}
                placeholder="Ajoutez une description..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Fichiers */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500">Fichiers ({task.files.length})</label>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-60">
                  <Paperclip className="w-3 h-3" />
                  {uploading ? "Upload..." : "Ajouter"}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={uploadFile} />
              </div>
              {task.files.length === 0 ? (
                <p className="text-xs text-gray-300 py-2">Aucun fichier</p>
              ) : (
                <div className="space-y-1.5">
                  {task.files.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 group">
                      <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="flex-1 text-xs text-gray-700 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400">{formatSize(f.size)}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={f.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={() => deleteFile(f.id)} className="text-gray-400 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Commentaires */}
            <div className="px-5 py-3">
              <label className="text-xs font-medium text-gray-500 block mb-3">Commentaires ({task.comments.length})</label>
              <div className="space-y-3 mb-3">
                {task.comments.length === 0 && (
                  <p className="text-xs text-gray-300">Aucun commentaire</p>
                )}
                {task.comments.map((c) => (
                  <div key={c.id} className="group">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xs font-medium">{c.author.name.charAt(0)}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-700">{c.author.name}</span>
                      <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                      {(c.author.id === currentUserId || currentUserRole === "ADMIN") && (
                        <button onClick={() => deleteComment(c.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="ml-7 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{c.content}</div>
                  </div>
                ))}
              </div>

              {/* Add comment */}
              <form onSubmit={sendComment} className="flex gap-2">
                <input
                  value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" disabled={sendingComment || !comment.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
