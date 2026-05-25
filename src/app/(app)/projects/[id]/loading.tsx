export default function ProjectDetailLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-gray-100 rounded-lg mt-1" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-48 bg-gray-200 rounded" />
                <div className="h-5 w-20 bg-gray-100 rounded-full" />
              </div>
              <div className="flex gap-4">
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-3 w-40 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="h-5 w-10 bg-gray-200 rounded mb-1 ml-auto" />
            <div className="h-1.5 w-32 bg-gray-100 rounded-full mb-1" />
            <div className="h-3 w-20 bg-gray-100 rounded ml-auto" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4">
          {["Résumé", "Milestones", "Gantt", "Ressources"].map((tab) => (
            <div key={tab} className="px-4 py-2">
              <div className="h-4 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-4">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-48 bg-gray-100 rounded-xl" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
