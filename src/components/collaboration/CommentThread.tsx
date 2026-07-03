import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, CheckCircle, Reply, Clock } from "lucide-react";
import { useCollaboration, CollaborationComment } from "@/hooks/useCollaboration";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface CommentThreadProps { entityType?: string;
  entityId?: string;
  showEntityFilter?: boolean;
}

const COMMENT_FILTERS = ["all", "open", "resolved"] as const;

export const CommentThread = ({ entityType, entityId, showEntityFilter = false }: CommentThreadProps) => { const { useComments, addComment, resolveComment } = useCollaboration();
  const { data: comments = [], isLoading } = useComments(entityType, entityId);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const filteredComments = comments.filter((c) => { if (filter === "open") return !c.is_resolved;
    if (filter === "resolved") return c.is_resolved;
    return true;
  });

  const handleSubmit = () => { if (!newComment.trim() || !entityType || !entityId) return;
    addComment.mutate(
      { entity_type: entityType, entity_id: entityId, content: newComment },
      { onSuccess: () => setNewComment("") }
    );
  };

  const handleReply = (parentId: string) => { if (!replyContent.trim() || !entityType || !entityId) return;
    addComment.mutate(
      { entity_type: entityType, entity_id: entityId, content: replyContent, parent_comment_id: parentId },
      { onSuccess: () => { setReplyContent(""); setReplyingTo(null); } }
    );
  };

  const entityTypeLabel = (type: string) => { const labels: Record<string, string> = { journal_entry: "Verifikation",
      invoice: "Faktura",
      bank_transaction: "Banktransaktion",
      expense_claim: "Utlägg",
      report: "Rapport",
      payroll_run: "Lönekörning",
      fixed_asset: "Tillgång",
    };
    return labels[type] || type;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Diskussioner
          </CardTitle>
          <div className="flex gap-1">
            {COMMENT_FILTERS.map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Alla" : f === "open" ? "Öppna" : "Lösta"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {entityType && entityId && (
          <div className="flex gap-2">
            <Textarea
              placeholder="Skriv en kommentar... Använd @namn för att omnämna kollegor"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px]"
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!newComment.trim() || addComment.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Laddar...</p>
        ) : filteredComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Inga kommentarer ännu
          </p>
        ) : (
          <div className="space-y-3">
            {filteredComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onResolve={() => resolveComment.mutate(comment.id)}
                onReply={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                isReplying={replyingTo === comment.id}
                replyContent={replyContent}
                onReplyContentChange={setReplyContent}
                onSubmitReply={() => handleReply(comment.id)}
                showEntity={showEntityFilter}
                entityTypeLabel={entityTypeLabel}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CommentCard = ({ comment,
  onResolve,
  onReply,
  isReplying,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  showEntity,
  entityTypeLabel,
}: { comment: CollaborationComment;
  onResolve: () => void;
  onReply: () => void;
  isReplying: boolean;
  replyContent: string;
  onReplyContentChange: (v: string) => void;
  onSubmitReply: () => void;
  showEntity: boolean;
  entityTypeLabel: (t: string) => string;
}) => (
  <div className={`border rounded-lg p-3 space-y-2 ${comment.is_resolved ? "opacity-60" : ""}`}>
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
          {comment.user_id.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Användare</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.created_at), "d MMM HH:mm", { locale: sv })}
            </span>
          </div>
          {showEntity && (
            <Badge variant="outline" className="text-xs mt-0.5">
              {entityTypeLabel(comment.entity_type)}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        {!comment.is_resolved && (
          <Button variant="ghost" size="sm" onClick={onResolve} className="h-7 text-xs">
            <CheckCircle className="h-3 w-3 mr-1" /> Lös
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onReply} className="h-7 text-xs">
          <Reply className="h-3 w-3 mr-1" /> Svara
        </Button>
      </div>
    </div>

    <p className="text-sm">{comment.content}</p>

    {comment.is_resolved && (
      <Badge variant="secondary" className="text-xs">
        <CheckCircle className="h-3 w-3 mr-1" /> Löst
      </Badge>
    )}

    {/* Replies */}
    {comment.replies && comment.replies.length > 0 && (
      <div className="ml-6 space-y-2 border-l-2 border-muted pl-3">
        {comment.replies.map((reply) => (
          <div key={reply.id} className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-xs">Användare</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(reply.created_at), "d MMM HH:mm", { locale: sv })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{reply.content}</p>
          </div>
        ))}
      </div>
    )}

    {isReplying && (
      <div className="ml-6 flex gap-2">
        <Textarea
          placeholder="Skriv ett svar..."
          value={replyContent}
          onChange={(e) => onReplyContentChange(e.target.value)}
          className="min-h-[40px] text-sm"
        />
        <Button size="sm" onClick={onSubmitReply} disabled={!replyContent.trim()}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    )}
  </div>
);
