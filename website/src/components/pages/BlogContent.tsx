"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { format } from "date-fns";

// Interface matching the passed data structure
export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  tags: string[];
  // content is not needed for the card view
  // featuredImage is optional
  featuredImage?: string;
}

interface BlogContentProps {
  posts: BlogPost[];
}

const categories = ["All", "Industry Insights", "Business Tips", "Research", "Tutorials"];

export function BlogContent({ posts }: BlogContentProps) {
  // Helper to estimate read time (plain text estimate)
  // detailed calculation would require the full content
  const getReadTime = () => "5 min read";

  return (
    <>
      {/* Hero Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-hashview-purple/10 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-hashview-orange/20 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-hashview-orange/20 text-hashview-orange text-sm font-medium mb-6">
              <Image src={logo} alt="HashView Logo" width={20} height={20} className="w-5 h-5" />
              <span>Our Blog</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Insights & <span className="gradient-text">Updates</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Stay updated with the latest trends in customer engagement, business growth tips, and HashView updates.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-y border-border bg-card/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-wrap gap-3">
            {categories.map((category, index) => (
              <motion.button
                key={category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${index === 0
                    ? "bg-gradient-to-r from-hashview-purple to-hashview-orange text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  }`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          {posts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No blog posts found.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, index) => (
                <motion.article
                  key={post._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group"
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    {/* Thumbnail placeholder */}
                    <div className="aspect-video rounded-2xl bg-gradient-to-br from-hashview-purple/20 to-hashview-orange/20 mb-6 overflow-hidden relative">
                      {post.featuredImage ? (
                        <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-card/50 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center group-hover:scale-110 transition-transform duration-300 p-2">
                            <Image src={logo} alt="HashView Logo" width={48} height={48} className="w-full h-full object-contain" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    {post.tags && post.tags.length > 0 && (
                      <span className="inline-block px-3 py-1 rounded-full bg-hashview-purple/20 text-hashview-purple text-xs font-medium mb-3">
                        {post.tags[0]}
                      </span>
                    )}

                    {/* Title */}
                    <h2 className="font-display text-xl font-bold mb-3 group-hover:gradient-text transition-all duration-300">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : 'Recently'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {getReadTime()}
                      </div>
                    </div>

                    {/* Read more */}
                    <div className="mt-4 flex items-center gap-2 text-hashview-purple font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Read More <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

