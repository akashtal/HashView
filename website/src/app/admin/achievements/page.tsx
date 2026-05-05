"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, ExternalLink, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Achievement {
  _id: string;
  title: string;
  award?: string;
  description: string;
  logoUrl: string;
  storyLink: string;
  winner?: string;
  createdAt: string;
}

export default function AdminAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const response = await fetch("/api/achievements");
      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this achievement?")) return;

    try {
      const response = await fetch(`/api/achievements/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete achievement");

      toast({
        title: "Success",
        description: "Achievement deleted successfully",
      });

      fetchAchievements();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete achievement",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-muted-foreground">Manage your website achievements and recognition</p>
        </div>
        <Link href="/admin/achievements/new">
          <Button variant="hero">
            <Plus className="mr-2 h-4 w-4" />
            Add Achievement
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {achievements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No achievements yet</p>
              <Link href="/admin/achievements/new">
                <Button variant="outline" className="mt-4">
                  Add your first achievement
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          achievements.map((achievement) => (
            <Card key={achievement._id}>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-16 h-16 relative flex-shrink-0 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                      {achievement.logoUrl ? (
                        <Image
                          src={achievement.logoUrl}
                          alt={achievement.title}
                          fill
                          className="object-contain p-2"
                        />
                      ) : (
                        <Trophy className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{achievement.title}</CardTitle>
                      {achievement.award && (
                        <p className="text-sm font-semibold text-hashview-purple mt-1">
                          {achievement.award}
                        </p>
                      )}
                      {achievement.winner && (
                        <p className="text-xs text-muted-foreground">Winner: {achievement.winner}</p>
                      )}
                      <CardDescription className="mt-2 line-clamp-2">
                        {achievement.description}
                      </CardDescription>
                      <div className="mt-2">
                        <a
                          href={achievement.storyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1 text-hashview-orange hover:underline"
                        >
                          View full story <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end md:self-start">
                    <Link href={`/admin/achievements/${achievement._id}/edit`}>
                      <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(achievement._id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
