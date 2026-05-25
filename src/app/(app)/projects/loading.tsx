export default function ProjectsLoading() {
  return (
    <div className="p-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-32 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-48 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-lg" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="h-5 w-36 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full mb-3" />
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-gray-100 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
