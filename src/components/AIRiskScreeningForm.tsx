import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  prohibitedUses: z.enum(["yes", "no"], {
    required_error: "Please select an option.",
  }),
  euSafetyRegulations: z.enum(["yes", "no"]).optional(),
  typesOfProcessing: z.enum(["yes", "no"]).optional(),
  processingExemptions: z.enum(["yes", "no"]).optional(),
})

type FormValues = z.infer<typeof formSchema>

type Page =
  | "q1"
  | "q2"
  | "q3"
  | "q3sub"
  | "prohibited-ending"
  | "high-risk-ending"
  | "technical-ending"

interface RadioTileProps {
  value: string
  label: string
  description?: string
  selected: boolean
  onClick: () => void
}

function RadioTile({ value, label, description, selected, onClick }: RadioTileProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex cursor-pointer rounded-lg border-2 p-6 shadow-sm transition-all hover:shadow-md",
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300"
      )}
    >
      <div className="flex w-full items-start">
        <div className="flex h-6 items-center">
          <div
            className={cn(
              "h-5 w-5 rounded-full border-2 transition-all",
              selected
                ? "border-primary bg-primary"
                : "border-gray-300 bg-white"
            )}
          >
            {selected && (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            )}
          </div>
        </div>
        <div className="ml-4 flex-1">
          <span className={cn(
            "block text-base font-semibold",
            selected ? "text-primary" : "text-gray-900"
          )}>
            {label}
          </span>
          {description && (
            <span className="mt-1 block text-sm text-gray-500">
              {description}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function AIRiskScreeningForm() {
  const [currentPage, setCurrentPage] = useState<Page>("q1")
  const [pageHistory, setPageHistory] = useState<Page[]>(["q1"])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  const prohibitedUsesValue = form.watch("prohibitedUses")
  const euSafetyValue = form.watch("euSafetyRegulations")
  const typesOfProcessingValue = form.watch("typesOfProcessing")
  const processingExemptionsValue = form.watch("processingExemptions")

  const navigateToPage = (page: Page) => {
    setCurrentPage(page)
    setPageHistory([...pageHistory, page])
  }

  const goBack = () => {
    if (pageHistory.length > 1) {
      const newHistory = [...pageHistory]
      newHistory.pop() // Remove current page
      const previousPage = newHistory[newHistory.length - 1]
      setPageHistory(newHistory)
      setCurrentPage(previousPage)
    }
  }

  const handleQ1Next = () => {
    if (!prohibitedUsesValue) {
      form.setError("prohibitedUses", { message: "Please select an option" })
      return
    }

    if (prohibitedUsesValue === "yes") {
      navigateToPage("prohibited-ending")
    } else {
      navigateToPage("q2")
    }
  }

  const handleQ2Next = () => {
    if (!euSafetyValue) {
      form.setError("euSafetyRegulations", { message: "Please select an option" })
      return
    }
    navigateToPage("q3")
  }

  const handleQ3Next = () => {
    if (!typesOfProcessingValue) {
      form.setError("typesOfProcessing", { message: "Please select an option" })
      return
    }

    if (typesOfProcessingValue === "yes") {
      navigateToPage("q3sub")
    } else {
      navigateToPage("technical-ending")
    }
  }

  const handleQ3SubNext = () => {
    if (!processingExemptionsValue) {
      form.setError("processingExemptions", { message: "Please select an option" })
      return
    }

    if (processingExemptionsValue === "yes") {
      navigateToPage("high-risk-ending")
    } else {
      navigateToPage("technical-ending")
    }
  }

  const resetForm = () => {
    form.reset()
    setCurrentPage("q1")
    setPageHistory(["q1"])
  }

  const getProgressPercentage = () => {
    const pageOrder: Record<Page, number> = {
      "q1": 1,
      "q2": 2,
      "q3": 3,
      "q3sub": 4,
      "prohibited-ending": 5,
      "high-risk-ending": 5,
      "technical-ending": 5,
    }
    return (pageOrder[currentPage] / 5) * 100
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Bar */}
      {!currentPage.includes("ending") && (
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(getProgressPercentage())}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            {currentPage.includes("ending")
              ? "Assessment Complete"
              : "AI Risk Screening Triage Form"}
          </CardTitle>
          <CardDescription>
            {currentPage === "q1" && "Question 1 of 3"}
            {currentPage === "q2" && "Question 2 of 3"}
            {currentPage === "q3" && "Question 3 of 3"}
            {currentPage === "q3sub" && "Follow-up Question"}
            {currentPage.includes("ending") && "Next steps for your AI system"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            {/* Page 1: Question 1 - Prohibited Uses */}
            {currentPage === "q1" && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="prohibitedUses"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-lg font-semibold text-gray-900">
                        Prohibited Uses
                      </FormLabel>
                      <p className="text-sm text-gray-600">
                        Will the AI system be used for any of the following purposes, which are classified as prohibited uses under the EU AI Act?
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                        <li>Manipulative techniques causing significant harm</li>
                        <li>Exploiting vulnerabilities of specific groups</li>
                        <li>Social scoring by public authorities</li>
                        <li>Real-time remote biometric identification in public spaces for law enforcement (with limited exceptions)</li>
                        <li>Other uses explicitly banned under Article 5 of the EU AI Act</li>
                      </ul>
                      <FormControl>
                        <div className="grid gap-4 mt-4">
                          <RadioTile
                            value="yes"
                            label="Yes"
                            description="The AI system will be used for one or more prohibited purposes"
                            selected={field.value === "yes"}
                            onClick={() => field.onChange("yes")}
                          />
                          <RadioTile
                            value="no"
                            label="No"
                            description="The AI system will not be used for any prohibited purposes"
                            selected={field.value === "no"}
                            onClick={() => field.onChange("no")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button onClick={handleQ1Next} size="lg" className="gap-2">
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Page 2: Question 2 - EU Safety Regulations */}
            {currentPage === "q2" && (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-900">
                    Perfect — thank you for confirming! We can now move forward with the next questions to map your AI system in more detail.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="euSafetyRegulations"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-lg font-semibold text-gray-900">
                        EU Safety Regulations / Conformity Assessment
                      </FormLabel>
                      <p className="text-sm text-gray-600">
                        Does the AI system form part of a product—or is it itself a product—that falls under EU safety regulations requiring an external/third-party conformity assessment?
                      </p>
                      <p className="text-sm text-gray-500 italic">
                        Examples include: machinery, medical devices, vehicles, aviation, or products covered by the New Legislative Framework.
                      </p>
                      <FormControl>
                        <div className="grid gap-4 mt-4">
                          <RadioTile
                            value="yes"
                            label="Yes"
                            description="The AI system requires third-party conformity assessment"
                            selected={field.value === "yes"}
                            onClick={() => field.onChange("yes")}
                          />
                          <RadioTile
                            value="no"
                            label="No"
                            description="No external conformity assessment is required"
                            selected={field.value === "no"}
                            onClick={() => field.onChange("no")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between pt-4">
                  <Button onClick={goBack} variant="outline" size="lg" className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleQ2Next} size="lg" className="gap-2">
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Page 3: Question 3 - Types of Processing */}
            {currentPage === "q3" && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-900">
                    {euSafetyValue === "yes"
                      ? "Thank you for your response. Because the AI system forms part of a regulated product that requires a third-party conformity assessment, it is likely to be classified as a high-risk AI system under the EU AI Act. We will now continue with the questions specifically designed for high-risk systems."
                      : "Thank you. Even without a conformity assessment, we still need to review the system's risk level, purpose, data use, and safeguards."}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="typesOfProcessing"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-lg font-semibold text-gray-900">
                        Types of Processing / High-Risk Determination
                      </FormLabel>
                      <p className="text-sm text-gray-600">
                        Will the AI system involve any of the following types of processing?
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                        <li>Biometric identification and categorisation of natural persons</li>
                        <li>Management and operation of critical infrastructure</li>
                        <li>Education and vocational training (e.g., assessment, monitoring)</li>
                        <li>Employment, workers management and access to self-employment</li>
                        <li>Access to and enjoyment of essential private services and public services and benefits</li>
                        <li>Law enforcement (risk assessment, polygraphs, emotion recognition, etc.)</li>
                        <li>Migration, asylum and border control management</li>
                        <li>Administration of justice and democratic processes</li>
                      </ul>
                      <FormControl>
                        <div className="grid gap-4 mt-4">
                          <RadioTile
                            value="yes"
                            label="Yes"
                            description="The AI system involves one or more of these processing types"
                            selected={field.value === "yes"}
                            onClick={() => field.onChange("yes")}
                          />
                          <RadioTile
                            value="no"
                            label="No"
                            description="None of these processing types apply"
                            selected={field.value === "no"}
                            onClick={() => field.onChange("no")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between pt-4">
                  <Button onClick={goBack} variant="outline" size="lg" className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleQ3Next} size="lg" className="gap-2">
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Page 4: Sub-question - Processing Exemptions */}
            {currentPage === "q3sub" && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="processingExemptions"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-lg font-semibold text-gray-900">
                        Exemption Conditions
                      </FormLabel>
                      <p className="text-sm text-gray-600">
                        Could you confirm whether the AI system falls into any of the following situations?
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                        <li>Performs a narrow procedural task</li>
                        <li>Improves the result of a previously completed human activity</li>
                        <li>Detects decision-making patterns or deviations from prior decision-making patterns (not used to replace or influence human assessment without proper human review)</li>
                        <li>Performs a preparatory task to an assessment relevant to high-risk cases</li>
                      </ul>
                      <FormControl>
                        <div className="grid gap-4 mt-4">
                          <RadioTile
                            value="yes"
                            label="Yes"
                            description="The AI system falls into one or more of these exemption categories"
                            selected={field.value === "yes"}
                            onClick={() => field.onChange("yes")}
                          />
                          <RadioTile
                            value="no"
                            label="No"
                            description="The AI system does not fall into any exemption category"
                            selected={field.value === "no"}
                            onClick={() => field.onChange("no")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between pt-4">
                  <Button onClick={goBack} variant="outline" size="lg" className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleQ3SubNext} size="lg" className="gap-2">
                    View Results <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Ending Page 1: Prohibited Use */}
            {currentPage === "prohibited-ending" && (
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0 mt-1" />
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-red-900">
                      Prohibited Use Detected
                    </h3>
                    <div className="text-sm text-red-800 space-y-3">
                      <p>
                        Thank you for your response. It appears that the AI system may fall under a prohibited use as defined by the EU AI Act.
                      </p>
                      <p>
                        Because these types of AI applications are not permitted, we need to pause this assessment at this stage.
                      </p>
                      <p>
                        To proceed safely and compliantly, please contact the (human) Lawyer so she/he can review the use case together and explore whether the AI system can be redesigned, reframed, or adapted to remove any legal or regulatory prohibited elements.
                      </p>
                      <p className="font-semibold">
                        Our goal is to support you in finding a lawful and responsible way to move forward with your project.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Next Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Contact your legal counsel or compliance officer</li>
                    <li>Schedule a review meeting to discuss the AI system's intended use</li>
                    <li>Explore alternative implementations that comply with EU AI Act requirements</li>
                    <li>Document any changes made to the system design or purpose</li>
                  </ol>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={goBack} variant="outline" size="lg" className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={resetForm} variant="secondary" size="lg">
                    Start New Assessment
                  </Button>
                </div>
              </div>
            )}

            {/* Ending Page 2: High-Risk AI System */}
            {currentPage === "high-risk-ending" && (
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-orange-50 border-2 border-orange-200 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-orange-600 flex-shrink-0 mt-1" />
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-orange-900">
                      High-Risk AI System Classification
                    </h3>
                    <div className="text-sm text-orange-800 space-y-3">
                      <p>
                        Thank you for your response. Based on the information provided, the AI system is likely to be classified as a high-risk AI system under the EU AI Act.
                      </p>
                      <p>
                        We will now continue with the technical questions, followed by the mandatory assessment for high-risk AI systems. These questions will help us understand the system's purpose, data use, safeguards, and operational context so we can determine the applicable compliance requirements and next steps.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Required Next Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Complete the mandatory technical assessment for high-risk AI systems</li>
                    <li>Implement a risk management system throughout the AI system's lifecycle</li>
                    <li>Establish data governance and management practices</li>
                    <li>Prepare technical documentation and maintain records</li>
                    <li>Ensure transparency and provide information to users</li>
                    <li>Implement human oversight measures</li>
                    <li>Ensure accuracy, robustness, and cybersecurity</li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Timeline:</strong> High-risk AI systems must comply with all EU AI Act requirements before market deployment or use.
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={goBack} variant="outline" size="lg" className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={resetForm} variant="secondary" size="lg">
                    Start New Assessment
                  </Button>
                </div>
              </div>
            )}

            {/* Ending Page 3: Technical Characteristics */}
            {currentPage === "technical-ending" && (
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                  <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-green-900">
                      Technical Characteristics Assessment
                    </h3>
                    <div className="text-sm text-green-800 space-y-3">
                      <p>
                        Thank you for your response. As the AI system does not fall under any of the exemption conditions, we will continue with the next question about its technical characteristics.
                      </p>
                      <p>
                        Your organisation aims to map all AI systems—regardless of their risk level—so this information is still important. After this stage, your part of the assessment will be complete, and we appreciate your time and collaboration.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Next Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Proceed with the technical characteristics questionnaire</li>
                    <li>Document the AI system's specifications and capabilities</li>
                    <li>Identify any data sources and processing methods</li>
                    <li>Map the system within your organization's AI inventory</li>
                    <li>Review basic transparency and documentation requirements</li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> While this system is not classified as high-risk, maintaining proper documentation and transparency is still recommended as a best practice.
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={goBack} variant="outline" size="lg" className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={resetForm} variant="secondary" size="lg">
                    Start New Assessment
                  </Button>
                </div>
              </div>
            )}
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
