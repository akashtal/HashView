"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface AchievementFormData {
  title: string;
  award: string;
  description: string;
  logoUrl: string;
  storyLink: string;
  winner: string;
  quote: string;
  quoteAuthor: string;
  date: string;
  featured: boolean;
  order: number;
}

export default function NewAchievementPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState<AchievementFormData>({
    title: "",
    award: "",
    description: "",
    logoUrl: "",
    storyLink: "",
    winner: "",
    quote: "",
    quoteAuthor: "",
    date: "",
    featured: true,
    order: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create achievement");
      }

      toast({
        title: "Success",
        description: "Achievement created successfully",
      });

      router.push("/admin/achievements");
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" 
        ? (e.target as any).checked 
        : type === "number" 
          ? Number(value) 
          : value,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/achievements">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">New Achievement</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Achievement Details</CardTitle>
          <CardDescription>Add a new achievement or award recognition</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (Article Headline)</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Business Wales honours five rising Welsh entrepreneurs..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="award">Award Name (Optional)</Label>
                <Input
                  id="award"
                  name="award"
                  value={formData.award}
                  onChange={handleChange}
                  placeholder="Accelerator Champion Award"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="winner">Winner Name (Optional)</Label>
                <Input
                  id="winner"
                  name="winner"
                  value={formData.winner}
                  onChange={handleChange}
                  placeholder="Sakshi Mahajan"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Full Text/Summary)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Hashview is a next generation trust engine..."
                className="min-h-[120px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quote">Direct Quote (Optional)</Label>
                <Textarea
                  id="quote"
                  name="quote"
                  value={formData.quote}
                  onChange={handleChange}
                  placeholder="I realized how co-dependent tourists and hospitality venues are..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quoteAuthor">Quote Author (Optional)</Label>
                <Input
                  id="quoteAuthor"
                  name="quoteAuthor"
                  value={formData.quoteAuthor}
                  onChange={handleChange}
                  placeholder="Sakshi Mahajan, CEO & Founder"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="logoUrl">Logo URL (Icon)</Label>
                  <span className="text-[10px] text-muted-foreground">URL or Upload File</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    value={formData.logoUrl}
                    onChange={handleChange}
                    placeholder="/wales-247-logo.png"
                    required
                    className="flex-1"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const uploadFormData = new FormData();
                          uploadFormData.append("file", file);
                          try {
                            const res = await fetch("/api/upload", {
                              method: "POST",
                              body: uploadFormData,
                            });
                            const data = await res.json();
                            if (data.url) {
                              setFormData(prev => ({ ...prev, logoUrl: data.url }));
                              toast({ title: "Success", description: "Image uploaded!" });
                            }
                          } catch (err) {
                            toast({ title: "Error", description: "Upload failed", variant: "destructive" });
                          }
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" className="h-full">
                      Upload
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="storyLink">Full Story Link (URL)</Label>
                <Input
                  id="storyLink"
                  name="storyLink"
                  value={formData.storyLink}
                  onChange={handleChange}
                  placeholder="https://www.wales247.co.uk/..."
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Publication Date (Optional)</Label>
                <Input
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  placeholder="March 19, 2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Display Order (Lower comes first)</Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  value={formData.order}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href="/admin/achievements">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="hero" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Achievement
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
