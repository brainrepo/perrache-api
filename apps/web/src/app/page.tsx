export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">Perrache</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Automated API catalog with semantic search
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/api/health"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Check API Health
          </a>
          <a
            href="/docs"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Documentation
          </a>
        </div>
      </div>
    </main>
  )
}
