export default function MesTachesLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded-lg mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded-lg mb-6" />

      {/* Filtres */}
      <div className="flex gap-2 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-gray-100 rounded-full" />
        ))}
      </div>

      {/* Groupes */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <div className="h-4 w-4 bg-gray-200 rounded" />
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded-full ml-auto" />
            </div>
            <div className="divide-y divide-gray-50">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-4 h-4 bg-gray-100 rounded-full flex-shrink-0" />
                  <div className="flex-1 h-4 bg-gray-100 rounded" />
                  <div className="h-4 w-20 bg-gray-50 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
