# AI Risk Screening Triage Form

A comprehensive React component for assessing AI systems under the EU AI Act. This form guides users through a series of questions to determine the risk level and compliance requirements for their AI systems.

## Features

- **React Hook Form Integration**: Efficient form management with validation
- **Shadcn UI Components**: Beautiful, accessible UI components
- **Tailwind CSS Styling**: Modern, responsive design
- **Conditional Logic**: Dynamic form flow based on user responses
- **TypeScript**: Type-safe implementation
- **Zod Validation**: Schema-based form validation

## Project Structure

```
src/
├── components/
│   ├── ui/                    # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── form.tsx
│   │   ├── label.tsx
│   │   ├── radio-group.tsx
│   │   └── alert-dialog.tsx
│   └── AIRiskScreeningForm.tsx # Main form component
├── lib/
│   └── utils.ts               # Utility functions
├── App.tsx                    # Application root
├── main.tsx                   # Entry point
└── index.css                  # Global styles
```

## Form Flow

### Question 1: Prohibited Uses
Determines if the AI system falls under prohibited uses according to the EU AI Act.
- **Yes**: Displays a dialog instructing the user to contact a lawyer
- **No**: Proceeds to Question 2

### Question 2: EU Safety Regulations
Assesses whether the AI system requires third-party conformity assessment.
- **Yes**: System likely classified as high-risk, proceeds to Question 3
- **No**: Still requires review, proceeds to Question 3

### Question 3: Types of Processing
Evaluates if the system involves high-risk processing activities.
- **Yes**: Shows sub-question about exemption conditions
  - **Yes (exemptions apply)**: High-risk classification with technical assessment required
  - **No (no exemptions)**: Technical characteristics assessment required
- **No**: Technical characteristics assessment required

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Dependencies

- React 18.2+
- react-hook-form 7.49+
- Zod 3.22+
- Radix UI components
- Tailwind CSS 3.4+
- TypeScript 5.3+

## Usage

The `AIRiskScreeningForm` component can be imported and used in any React application:

```tsx
import { AIRiskScreeningForm } from "./components/AIRiskScreeningForm"

function App() {
  return (
    <div className="container mx-auto py-8">
      <AIRiskScreeningForm />
    </div>
  )
}
```

## Styling

The form uses Tailwind CSS for styling and includes:
- Responsive design for mobile, tablet, and desktop
- Accessible color contrasts
- Clear visual hierarchy
- Interactive feedback for user actions

## Compliance

This form is designed to help organizations comply with the EU AI Act by:
- Identifying prohibited AI uses
- Assessing high-risk classifications
- Determining compliance requirements
- Guiding appropriate next steps

## License

MIT
