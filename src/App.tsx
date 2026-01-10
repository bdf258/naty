import { useState } from "react"
import { AIRiskScreeningForm } from "./components/AIRiskScreeningForm"
import { DPIAAssessmentForm } from "./components/DPIAAssessmentForm"

type AppView = 'triage' | 'dpia'
type TriageResult = 'high-risk' | 'technical' | undefined

function App() {
  const [currentView, setCurrentView] = useState<AppView>('triage')
  const [triageResult, setTriageResult] = useState<TriageResult>(undefined)

  const handleTriageComplete = (result: 'high-risk' | 'technical') => {
    setTriageResult(result)
    setCurrentView('dpia')
  }

  const handleBackToTriage = () => {
    setCurrentView('triage')
    setTriageResult(undefined)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            EU AI Act Compliance
          </h1>
          <p className="text-lg text-slate-600">
            {currentView === 'triage'
              ? "AI Risk Screening and Assessment Tool"
              : "Data Protection Impact Assessment"
            }
          </p>
          {currentView === 'triage' && (
            <p className="text-sm text-slate-500 mt-2">
              Complete the triage to determine your AI system's risk level, then proceed to the detailed DPIA assessment
            </p>
          )}
        </div>

        {currentView === 'triage' ? (
          <AIRiskScreeningForm onProceedToDPIA={handleTriageComplete} />
        ) : (
          <DPIAAssessmentForm
            onBack={handleBackToTriage}
            triageResult={triageResult}
          />
        )}
      </div>
    </div>
  )
}

export default App
