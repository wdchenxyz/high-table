import Link from "next/link";
import { MessageSquare, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <main className="flex w-full max-w-3xl flex-col items-center gap-12 px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
            High Table
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Choose your AI experience
          </p>
        </div>

        <div className="grid w-full gap-6 sm:grid-cols-2">
          <Link href="/chat" className="group">
            <Card className="h-full transition-all hover:border-primary hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <CardTitle>Chat</CardTitle>
                <CardDescription>
                  Have a one-on-one conversation with an AI assistant. Perfect for quick questions and direct dialogue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary group-hover:underline">
                  Start chatting &rarr;
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/council" className="group">
            <Card className="h-full transition-all hover:border-primary hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-600">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle>High Table</CardTitle>
                <CardDescription>
                  Submit a question to multiple AI models for deliberation. Get diverse perspectives and a synthesized answer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary group-hover:underline">
                  Convene the council &rarr;
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
