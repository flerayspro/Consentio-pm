export default function TemplatesLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-9 w-40 bg-gray-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-5 w-36 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-28 bg-gray-100 rounded mb-4" />
            <div className="space-y-1.5">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-3 w-full bg-gray-50 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
