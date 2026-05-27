export default function FlywheelLoading() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-52 bg-gray-200 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-5 w-64 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-3 w-96 bg-gray-100 rounded animate-pulse mb-4" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((j) => <div key={j} className="h-6 w-28 bg-gray-100 rounded-full animate-pulse" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
