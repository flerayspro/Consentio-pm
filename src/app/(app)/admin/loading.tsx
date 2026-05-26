export default function AdminLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-48 bg-gray-200 rounded-lg" />
        <div className="h-10 w-44 bg-gray-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="w-9 h-9 bg-gray-100 rounded-lg mb-3" />
            <div className="h-7 w-10 bg-gray-200 rounded mb-1" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
            <div className="w-9 h-9 bg-gray-100 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-24 bg-gray-100 rounded-full" />
            <div className="flex gap-1">
              <div className="w-8 h-8 bg-gray-100 rounded-lg" />
              <div className="w-8 h-8 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
