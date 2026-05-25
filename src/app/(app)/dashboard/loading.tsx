export default function DashboardLoading() {
  return (
    <div className="p-8 animate-pulse">
      {/* Titre */}
      <div className="mb-8">
        <div className="h-7 w-48 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="w-9 h-9 bg-gray-100 rounded-lg mb-3" />
            <div className="h-7 w-12 bg-gray-200 rounded mb-1" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between mb-2">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-4 w-8 bg-gray-100 rounded" />
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom block */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 rounded-lg border border-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
