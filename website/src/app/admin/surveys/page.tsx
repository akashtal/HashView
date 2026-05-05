"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, CheckCircle2, Users, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Survey {
  _id: string;
  type: "customer" | "partner";
  answers: Record<string, string>;
  read: boolean;
  createdAt: string;
}

const customerQuestions = [
  "Do you usually check Google or TripAdvisor before visiting a place?",
  "Do you often leave reviews after your visit?",
  "Would you like to get instant rewards (scratch cards, cashback) for your reviews?",
  "Would you like to be notified when HASHVIEW launches in your city?",
];

const partnerQuestions = [
  "Do you currently use Google Reviews or TripAdvisor to manage feedback?",
  "Are you happy with the reviews your business gets online?",
  "Would you like to get verified local reviews only from customers on venue?",
  "Would it help if customers were rewarded instantly for reviewing your business?",
  "How soon would you like to start getting genuine reviews?",
];

export default function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filter, setFilter] = useState<"all" | "customer" | "partner">("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSurveys();
  }, [filter]);

  const fetchSurveys = async () => {
    try {
      const url = filter === "all" ? "/api/surveys" : `/api/surveys?type=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setSurveys(data.surveys || []);
    } catch (error) {
      console.error("Failed to fetch surveys:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string, read: boolean) => {
    try {
      const response = await fetch(`/api/surveys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });

      if (!response.ok) throw new Error("Failed to update survey");

      fetchSurveys();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update survey",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this survey?")) return;

    try {
      const response = await fetch(`/api/surveys/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete survey");

      toast({
        title: "Success",
        description: "Survey deleted successfully",
      });

      fetchSurveys();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete survey",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const questions = filter === "customer" ? customerQuestions : partnerQuestions;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Survey Submissions</h1>
        <p className="text-muted-foreground">View and manage survey responses</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "customer" ? "default" : "outline"}
          onClick={() => setFilter("customer")}
        >
          <Users className="mr-2 h-4 w-4" />
          Customer
        </Button>
        <Button
          variant={filter === "partner" ? "default" : "outline"}
          onClick={() => setFilter("partner")}
        >
          <Briefcase className="mr-2 h-4 w-4" />
          Partner
        </Button>
      </div>

      <div className="space-y-4">
        {surveys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No survey submissions yet</p>
            </CardContent>
          </Card>
        ) : (
          surveys.map((survey) => (
            <Card key={survey._id} className={!survey.read ? "border-hashview-purple/50" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="capitalize">
                        {survey.type === "customer" ? (
                          <Users className="inline h-4 w-4 mr-2" />
                        ) : (
                          <Briefcase className="inline h-4 w-4 mr-2" />
                        )}
                        {survey.type} Survey
                      </CardTitle>
                      {!survey.read && (
                        <span className="text-xs bg-hashview-purple/20 text-hashview-purple px-2 py-1 rounded">
                          New
                        </span>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {format(new Date(survey.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!survey.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkRead(survey._id, true)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Mark Read
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(survey._id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(survey.answers).map(([questionId, answer], index) => (
                    <div key={questionId} className="border-l-2 border-hashview-purple pl-4">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {questions[parseInt(questionId) - 1] || `Question ${questionId}`}
                      </p>
                      <p className="text-sm font-semibold">{answer}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

