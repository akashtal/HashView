"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, X, User, Mail, Phone } from "lucide-react";

interface SurveyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const surveyQuestions = [
  {
    id: 1,
    question: "Do you usually check Google or TripAdvisor before visiting a place?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: 2,
    question: "Do you often leave reviews after your visit?",
    options: [
      { value: "always", label: "Always" },
      { value: "sometimes", label: "Sometimes" },
      { value: "rarely", label: "Rarely" },
    ],
  },
  {
    id: 3,
    question: "Would you like to get instant rewards (scratch cards, cashback) for your reviews?",
    options: [
      { value: "yes", label: "Yes!" },
      { value: "maybe", label: "Maybe" },
    ],
  },
  {
    id: 4,
    question: "Would you like to be notified when HASHVIEW launches in your city?",
    options: [
      { value: "yes", label: "Yes, notify me!" },
      { value: "no", label: "Not now" },
    ],
  },
];

export const SurveyModal = ({ open, onOpenChange }: SurveyModalProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactDetails, setContactDetails] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswer = async (value: string) => {
    const questionId = surveyQuestions[currentQuestion].id;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

    // Move to next question or show contact form
    if (currentQuestion < surveyQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion((prev) => prev + 1);
      }, 300);
    } else {
      setTimeout(() => {
        setShowContactForm(true);
      }, 300);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await fetch("/api/surveys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "customer",
          answers: answers, // Note: The last answer is already in state
          contactDetails: contactDetails,
        }),
      });
      setIsComplete(true);
      setShowContactForm(false);
    } catch (error) {
      console.error("Failed to submit survey:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setContactDetails({ name: "", email: "", phone: "" });
    setShowContactForm(false);
    setIsComplete(false);
    onOpenChange(false);
  };

  const currentQ = surveyQuestions[currentQuestion];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl p-0 overflow-hidden">
        <div className="relative">
          {/* Progress Bar */}
          {!isComplete && !showContactForm && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary">
              <motion.div
                className="h-full bg-gradient-to-r from-hashview-purple to-hashview-orange"
                initial={{ width: "0%" }}
                animate={{
                  width: `${((currentQuestion + 1) / surveyQuestions.length) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-2xl font-bold text-center">
              {isComplete ? "Thank You!" : showContactForm ? "Almost There!" : "Quick Survey"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {isComplete
                ? "Your responses have been recorded. We'll keep you updated!"
                : showContactForm
                  ? "Where should we send your reward and updates?"
                  : `Question ${currentQuestion + 1} of ${surveyQuestions.length}`}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 min-h-[200px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="text-center space-y-4 py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="flex justify-center"
                  >
                    <CheckCircle2 className="w-16 h-16 text-hashview-orange" />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl font-semibold"
                  >
                    Survey Complete!
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-muted-foreground"
                  >
                    Thank you for taking the time to share your thoughts with us.
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button onClick={handleClose} variant="hero" size="lg" className="mt-4">
                      Close
                    </Button>
                  </motion.div>
                </motion.div>
              ) : !showContactForm ? (
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="w-full space-y-6"
                >
                  <motion.h3
                    key={`question-${currentQuestion}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl md:text-2xl font-semibold text-center"
                  >
                    {currentQ.question}
                  </motion.h3>

                  <div className="space-y-3">
                    {currentQ.options.map((option, index) => (
                      <motion.div
                        key={option.value}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                      >
                        <Button
                          variant={
                            answers[currentQ.id] === option.value
                              ? "hero"
                              : "outline"
                          }
                          size="lg"
                          className="w-full justify-center py-6 text-base md:text-lg hover:scale-105 transition-transform"
                          onClick={() => handleAnswer(option.value)}
                        >
                          {option.label}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="contact-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          value={contactDetails.name}
                          onChange={(e) =>
                            setContactDetails({ ...contactDetails, name: e.target.value })
                          }
                          required
                          placeholder="Your Name"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={contactDetails.email}
                          onChange={(e) =>
                            setContactDetails({ ...contactDetails, email: e.target.value })
                          }
                          required
                          placeholder="your@email.com"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          value={contactDetails.phone}
                          onChange={(e) =>
                            setContactDetails({ ...contactDetails, phone: e.target.value })
                          }
                          required
                          placeholder="Your Phone Number"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      className="w-full mt-4"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit & Claim Reward"}
                    </Button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog >
  );
};

