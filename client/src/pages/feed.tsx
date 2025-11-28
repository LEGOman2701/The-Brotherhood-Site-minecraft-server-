import { useQuery } from "@tanstack/react-query";
import { PostCard } from "@/components/post-card";
import { CreatePost } from "@/components/create-post";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useSearch, fuzzyScore } from "@/lib/search-context";
import type { PostWithAuthor } from "@shared/schema";

export default function FeedPage() {
  const { data: posts, isLoading, error } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/posts"],
  });
  const { searchQuery } = useSearch();

  const filteredPosts = posts
    ?.map((post) => {
      const contentScore = fuzzyScore(post.content, searchQuery);
      const authorScore = fuzzyScore(post.author.displayName, searchQuery);
      const score = Math.max(contentScore, authorScore);
      return { post, score };
    })
    .filter(({ score }) => score > 0.3 || !searchQuery)
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post) || [];

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <CreatePost />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">Failed to load posts. Please try again.</p>
        </Card>
      ) : posts && filteredPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : posts && posts.length > 0 && searchQuery ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2" data-testid="text-no-search-results">
            No posts match your search
          </h3>
          <p className="text-muted-foreground">
            Try searching with different keywords.
          </p>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-feed">
            No posts yet
          </h3>
          <p className="text-muted-foreground">
            Be the first to share something with The Brotherhood!
          </p>
        </Card>
      )}
    </div>
  );
}
