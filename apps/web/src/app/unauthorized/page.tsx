export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <h1 className="font-black text-4xl mb-4" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          Accès non autorisé
        </h1>
        <p className="text-gray-400 mb-6">Votre compte n'a pas les droits d'accès à l'administration.</p>
        <a href="/" className="text-blue-600 font-bold hover:underline">← Retour au site</a>
      </div>
    </div>
  )
}
