"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, ClipboardList, TrendingUp, Trophy, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Stats {
  blogs: {
    total: number;
    published: number;
    draft: number;
  };
  contacts: {
    total: number;
    unread: number;
    read: number;
  };
  surveys: {
    total: number;
    unread: number;
    read: number;
    customer: number;
    partner: number;
  };
  achievements: {
    total: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12">Failed to load statistics</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your website data</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blogs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.blogs.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.blogs.published} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.achievements.total}</div>
            <p className="text-xs text-muted-foreground">
              Featured news & awards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contacts.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.contacts.unread} unread messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surveys</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.surveys.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.surveys.unread} new submissions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/blogs/new">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4 text-hashview-purple" />
                Create New Blog Post
              </Button>
            </Link>
            <Link href="/admin/achievements/new">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4 text-hashview-orange" />
                Add New Achievement
              </Button>
            </Link>
            <Link href="/admin/achievements">
              <Button variant="outline" className="w-full justify-start">
                <Trophy className="mr-2 h-4 w-4" />
                Manage Achievements
              </Button>
            </Link>
            <Link href="/admin/contacts">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" />
                View All Contacts
              </Button>
            </Link>
            <Link href="/admin/surveys">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="mr-2 h-4 w-4" />
                View All Surveys
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Feature coming soon - view recent contacts and surveys here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

