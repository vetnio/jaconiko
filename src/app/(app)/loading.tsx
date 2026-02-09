import { Spinner } from "@/components/ui/spinner";

export default function AppLoading() {
  return (
    <div className="flex justify-center py-20">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
