export default function FlywheelPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-12">
      {/* Icon */}
      <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-200">
        <span className="text-white font-bold text-3xl">F</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Consentio Flywheel Activation
      </h1>
      <p className="text-gray-400 text-sm mb-8 max-w-sm">
        Cette instance est dédiée à l'activation des fournisseurs.
        Elle sera disponible prochainement.
      </p>

      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium px-4 py-2.5 rounded-full">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        En cours de construction
      </div>
    </div>
  );
}
