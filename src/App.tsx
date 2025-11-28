import { AIRiskScreeningForm } from "./components/AIRiskScreeningForm"

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            EU AI Act Compliance
          </h1>
          <p className="text-lg text-slate-600">
            AI Risk Screening and Assessment Tool
          </p>
        </div>
        <AIRiskScreeningForm />
      </div>
    </div>
  )
}

export default App
