import { Spinner } from "@/components/ui/spinner";

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
