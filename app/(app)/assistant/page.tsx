// MOCK_DATA — replace in Phase 2
import { mockMessages } from "@/lib/mock/conversations";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function AssistantPage() {
  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <h2 className="text-2xl font-bold tracking-tight mb-4">معاون</h2>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border p-4 space-y-4">
        {mockMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="اپنا سوال یہاں لکھیں..."
          className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
