"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  published: boolean;
  createdAt: string;
  views: number;
}

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const response = await fetch("/api/blogs");
      const data = await response.json();
      setBlogs(data.blogs || []);
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      const response = await fetch(`/api/blogs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete blog");

      toast({
        title: "Success",
        description: "Blog post deleted successfully",
      });

      fetchBlogs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete blog post",
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
          <h1 className="text-3xl font-bold">Blog Posts</h1>
          <p className="text-muted-foreground">Manage your blog content</p>
        </div>
        <Link href="/admin/blogs/new">
          <Button variant="hero">
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {blogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No blog posts yet</p>
              <Link href="/admin/blogs/new">
                <Button variant="outline" className="mt-4">
                  Create your first blog post
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          blogs.map((blog) => (
            <Card key={blog._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {blog.title}
                      {!blog.published && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded">
                          Draft
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">{blog.excerpt}</CardDescription>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{format(new Date(blog.createdAt), "MMM dd, yyyy")}</span>
                      <span>{blog.views} views</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/blogs/${blog._id}/edit`}>
                      <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(blog._id)}
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

