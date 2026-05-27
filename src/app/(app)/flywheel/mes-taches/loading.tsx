export default function Loading() {
  return (
    <div className="p-8 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
