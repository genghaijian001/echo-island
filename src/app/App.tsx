import { TooltipProvider } from "@/components/ui/tooltip"
import { EchoIsland } from "@/features/island/echo-island"

export function App() {
  return (
    <TooltipProvider>
      <main className="h-screen w-screen p-2">
        <EchoIsland />
      </main>
    </TooltipProvider>
  )
}
