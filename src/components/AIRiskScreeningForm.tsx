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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
  prohibitedUses: z.enum(["yes", "no"], {
    required_error: "Please select an option.",
  }),
  euSafetyRegulations: z.enum(["yes", "no"]).optional(),
  typesOfProcessing: z.enum(["yes", "no"]).optional(),
  processingExemptions: z.enum(["yes", "no"]).optional(),
})

type FormValues = z.infer<typeof formSchema>

export function AIRiskScreeningForm() {
  const [currentStep, setCurrentStep] = useState<"q1" | "q2" | "q3" | "q3sub" | "complete">("q1")
  const [showProhibitedDialog, setShowProhibitedDialog] = useState(false)
  const [showFinalDialog, setShowFinalDialog] = useState(false)
  const [finalMessage, setFinalMessage] = useState<{
    title: string
    description: string
  } | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string>("")

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  const prohibitedUsesValue = form.watch("prohibitedUses")
  const euSafetyValue = form.watch("euSafetyRegulations")
  const typesOfProcessingValue = form.watch("typesOfProcessing")
  const processingExemptionsValue = form.watch("processingExemptions")

  // Handle Question 1 change
  const handleQ1Change = (value: string) => {
    form.setValue("prohibitedUses", value as "yes" | "no")

    if (value === "yes") {
      setShowProhibitedDialog(true)
      setFeedbackMessage("")
    } else if (value === "no") {
      setFeedbackMessage("Perfect — thank you for confirming! We can now move forward with the next questions to map your AI system in more detail.")
      setCurrentStep("q2")
    }
  }

  // Handle Question 2 change
  const handleQ2Change = (value: string) => {
    form.setValue("euSafetyRegulations", value as "yes" | "no")

    if (value === "yes") {
      setFeedbackMessage("Thank you for your response. Because the AI system forms part of a regulated product that requires a third-party conformity assessment, it is likely to be classified as a high-risk AI system under the EU AI Act. We will now continue with the questions specifically designed for high-risk systems. These will help us understand the system's purpose, data use, safeguards, and operational context so we can determine the compliance obligations and next steps. Please continue to the next question.")
      setCurrentStep("q3")
    } else if (value === "no") {
      setFeedbackMessage("Thank you. Even without a conformity assessment, we still need to review the system's risk level, purpose, data use, and safeguards. Please continue to the next question.")
      setCurrentStep("q3")
    }
  }

  // Handle Question 3 change
  const handleQ3Change = (value: string) => {
    form.setValue("typesOfProcessing", value as "yes" | "no")

    if (value === "yes") {
      setFeedbackMessage("")
      setCurrentStep("q3sub")
    } else if (value === "no") {
      setFeedbackMessage("Thank you for your response. As the AI system does not fall under any of the exemption conditions, we will continue with the next question about its technical characteristics. Your organisation aims to map all AI systems—regardless of their risk level—so this information is still important. After this stage, your part of the assessment will be complete, and we appreciate your time and collaboration. Please continue to the next question.")
    }
  }

  // Handle Sub-question change
  const handleSubQuestionChange = (value: string) => {
    form.setValue("processingExemptions", value as "yes" | "no")

    if (value === "yes") {
      setFeedbackMessage("Thank you for your response. Based on the information provided, the AI system is likely to be classified as a high-risk AI system under the EU AI Act. We will now continue with the technical questions, followed by the mandatory assessment for high-risk AI systems. These questions will help us understand the system's purpose, data use, safeguards, and operational context so we can determine the applicable compliance requirements and next steps. Please continue to the next question.")
    } else if (value === "no") {
      setFeedbackMessage("Thank you for your response. As the AI system does not fall under any of the exemption conditions, we will continue with the next question about its technical characteristics. Your organisation aims to map all AI systems—regardless of their risk level—so this information is still important. After this stage, your part of the assessment will be complete, and we appreciate your time and collaboration. Please continue to the next question.")
    }
  }

  const onSubmit = (data: FormValues) => {
    // Determine final message based on form values
    if (data.prohibitedUses === "yes") {
      return // Already handled by dialog
    }

    if (data.typesOfProcessing === "yes" && data.processingExemptions === "yes") {
      setFinalMessage({
        title: "High-Risk AI System Assessment",
        description: "Based on your responses, the AI system is likely to be classified as a high-risk AI system under the EU AI Act. You will need to proceed with the mandatory technical assessment and ensure compliance with all applicable requirements.",
      })
    } else {
      setFinalMessage({
        title: "Technical Characteristics Assessment",
        description: "Thank you for completing this initial screening. Your AI system will proceed to the technical characteristics assessment phase. Your part of the assessment is complete, and we appreciate your time and collaboration.",
      })
    }

    setShowFinalDialog(true)
    setCurrentStep("complete")
  }

  const handleProhibitedAcknowledge = () => {
    setShowProhibitedDialog(false)
    // Reset form or keep user on current state
  }

  const handleFinalAcknowledge = () => {
    setShowFinalDialog(false)
    // Optionally reset form or navigate elsewhere
  }

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">AI Risk Screening Triage Form</CardTitle>
          <CardDescription>
            Please answer the following questions to help us assess your AI system under the EU AI Act
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Question 1: Prohibited Uses */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="prohibitedUses"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-semibold">
                        Question 1: Prohibited Uses
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Will the AI system be used for any of the following purposes, which are classified as prohibited uses under the EU AI Act?
                      </p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                        <li>Manipulative techniques causing significant harm</li>
                        <li>Exploiting vulnerabilities of specific groups</li>
                        <li>Social scoring by public authorities</li>
                        <li>Real-time remote biometric identification in public spaces for law enforcement (with limited exceptions)</li>
                        <li>Other uses explicitly banned under Article 5 of the EU AI Act</li>
                      </ul>
                      <FormControl>
                        <RadioGroup
                          onValueChange={handleQ1Change}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-3 space-y-0">
                            <RadioGroupItem value="yes" />
                            <Label className="font-normal cursor-pointer">
                              Yes
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3 space-y-0">
                            <RadioGroupItem value="no" />
                            <Label className="font-normal cursor-pointer">
                              No
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Feedback Message */}
              {feedbackMessage && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">{feedbackMessage}</p>
                </div>
              )}

              {/* Question 2: EU Safety Regulations */}
              {(currentStep === "q2" || currentStep === "q3" || currentStep === "q3sub") && (
                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="euSafetyRegulations"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold">
                          Question 2: EU Safety Regulations / Conformity Assessment
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Does the AI system form part of a product—or is it itself a product—that falls under EU safety regulations requiring an external/third-party conformity assessment?
                        </p>
                        <p className="text-sm text-muted-foreground italic">
                          Examples include: machinery, medical devices, vehicles, aviation, or products covered by the New Legislative Framework.
                        </p>
                        <FormControl>
                          <RadioGroup
                            onValueChange={handleQ2Change}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="yes" />
                              <Label className="font-normal cursor-pointer">
                                Yes
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="no" />
                              <Label className="font-normal cursor-pointer">
                                No
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Question 3: Types of Processing */}
              {(currentStep === "q3" || currentStep === "q3sub") && (
                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="typesOfProcessing"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold">
                          Question 3: Types of Processing / High-Risk Determination
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Will the AI system involve any of the following types of processing?
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
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
                          <RadioGroup
                            onValueChange={handleQ3Change}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="yes" />
                              <Label className="font-normal cursor-pointer">
                                Yes
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="no" />
                              <Label className="font-normal cursor-pointer">
                                No
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Sub-question: Processing Exemptions */}
              {currentStep === "q3sub" && typesOfProcessingValue === "yes" && (
                <div className="space-y-4 pt-4 border-t bg-slate-50 p-4 rounded-lg">
                  <FormField
                    control={form.control}
                    name="processingExemptions"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-semibold">
                          Follow-up: Exemption Conditions
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Could you confirm whether the AI system falls into any of the following situations?
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                          <li>Performs a narrow procedural task</li>
                          <li>Improves the result of a previously completed human activity</li>
                          <li>Detects decision-making patterns or deviations from prior decision-making patterns (not used to replace or influence human assessment without proper human review)</li>
                          <li>Performs a preparatory task to an assessment relevant to high-risk cases</li>
                        </ul>
                        <FormControl>
                          <RadioGroup
                            onValueChange={handleSubQuestionChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="yes" />
                              <Label className="font-normal cursor-pointer">
                                Yes - falls into one or more of these exemptions
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="no" />
                              <Label className="font-normal cursor-pointer">
                                No - does not fall into any exemption
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Submit Button */}
              {((currentStep === "q3" && typesOfProcessingValue === "no") ||
                (currentStep === "q3sub" && processingExemptionsValue)) && (
                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg" className="w-full sm:w-auto">
                    Submit Assessment
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Prohibited Uses Dialog */}
      <AlertDialog open={showProhibitedDialog} onOpenChange={setShowProhibitedDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Prohibited Use Detected</AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-3">
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleProhibitedAcknowledge} className="w-full sm:w-auto">
              Contact Lawyer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Assessment Dialog */}
      <AlertDialog open={showFinalDialog} onOpenChange={setShowFinalDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">{finalMessage?.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {finalMessage?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleFinalAcknowledge} className="w-full sm:w-auto">
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
