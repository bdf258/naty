import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock the child components to isolate App testing
vi.mock('./components/AIRiskScreeningForm', () => ({
  AIRiskScreeningForm: ({ onProceedToDPIA }: { onProceedToDPIA: (result: string) => void }) => (
    <div data-testid="triage-form">
      <button onClick={() => onProceedToDPIA('high-risk')}>Proceed High Risk</button>
      <button onClick={() => onProceedToDPIA('technical')}>Proceed Technical</button>
    </div>
  ),
}));

vi.mock('./components/DPIAAssessmentForm', () => ({
  DPIAAssessmentForm: ({ onBack, triageResult }: { onBack: () => void; triageResult: string }) => (
    <div data-testid="dpia-form">
      <span data-testid="triage-result">{triageResult}</span>
      <button onClick={onBack}>Back to Triage</button>
    </div>
  ),
}));

describe('App', () => {
  it('should render the main heading', () => {
    render(<App />);

    expect(screen.getByText('EU AI Act Compliance')).toBeInTheDocument();
  });

  it('should show triage form by default', () => {
    render(<App />);

    expect(screen.getByTestId('triage-form')).toBeInTheDocument();
    expect(screen.queryByTestId('dpia-form')).not.toBeInTheDocument();
  });

  it('should show correct subtitle for triage view', () => {
    render(<App />);

    expect(screen.getByText('AI Risk Screening and Assessment Tool')).toBeInTheDocument();
  });

  it('should navigate to DPIA form when triage completes with high-risk', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Proceed High Risk'));

    expect(screen.queryByTestId('triage-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('dpia-form')).toBeInTheDocument();
    expect(screen.getByTestId('triage-result')).toHaveTextContent('high-risk');
  });

  it('should navigate to DPIA form when triage completes with technical', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Proceed Technical'));

    expect(screen.getByTestId('dpia-form')).toBeInTheDocument();
    expect(screen.getByTestId('triage-result')).toHaveTextContent('technical');
  });

  it('should show DPIA subtitle when on DPIA view', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Proceed High Risk'));

    expect(screen.getByText('Data Protection Impact Assessment')).toBeInTheDocument();
  });

  it('should navigate back to triage from DPIA form', () => {
    render(<App />);

    // First navigate to DPIA
    fireEvent.click(screen.getByText('Proceed High Risk'));
    expect(screen.getByTestId('dpia-form')).toBeInTheDocument();

    // Navigate back
    fireEvent.click(screen.getByText('Back to Triage'));

    expect(screen.getByTestId('triage-form')).toBeInTheDocument();
    expect(screen.queryByTestId('dpia-form')).not.toBeInTheDocument();
  });

  it('should reset triage result when navigating back', () => {
    render(<App />);

    // Navigate to DPIA with high-risk
    fireEvent.click(screen.getByText('Proceed High Risk'));
    expect(screen.getByTestId('triage-result')).toHaveTextContent('high-risk');

    // Navigate back
    fireEvent.click(screen.getByText('Back to Triage'));

    // Navigate to DPIA again with different result
    fireEvent.click(screen.getByText('Proceed Technical'));
    expect(screen.getByTestId('triage-result')).toHaveTextContent('technical');
  });

  it('should have proper page structure and styling classes', () => {
    const { container } = render(<App />);

    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
    expect(container.querySelector('.max-w-7xl')).toBeInTheDocument();
  });
});
