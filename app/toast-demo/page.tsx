"use client"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function ToastDemo() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Toast Notification Demo</h1>
        <p className="text-muted-foreground">Test the new Sonner toast system with different notification types</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md">
        <Button variant="outline" onClick={() => toast.success("Deployment successful!")} className="w-full">
          Success Toast
        </Button>

        <Button
          variant="outline"
          onClick={() => toast.error("Deployment failed. Please check logs.")}
          className="w-full"
        >
          Error Toast
        </Button>

        <Button variant="outline" onClick={() => toast.info("A new version will be deployed soon.")} className="w-full">
          Info Toast
        </Button>

        <Button variant="outline" onClick={() => toast.warning("This action cannot be undone.")} className="w-full">
          Warning Toast
        </Button>

        <Button variant="outline" onClick={() => toast.loading("Deploying application...")} className="w-full">
          Loading Toast
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
              loading: "Uploading image...",
              success: "Image uploaded successfully!",
              error: "Failed to upload image",
            })
          }
          className="w-full"
        >
          Promise Toast
        </Button>
      </div>
    </div>
  )
}
