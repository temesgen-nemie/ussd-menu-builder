import { Fragment, useMemo } from "react";
import type { Node } from "reactflow";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type FlowBreadcrumbProps = {
  currentSubflowId: string | null;
  nodes: Node[];
  onNavigate: (targetId: string | null) => void;
  className?: string;
};

export default function FlowBreadcrumb({
  currentSubflowId,
  nodes,
  onNavigate,
  className,
}: FlowBreadcrumbProps) {
  const path = useMemo(() => {
    if (!currentSubflowId) return [];
    const result: { id: string; name: string }[] = [];
    let currId: string | null = currentSubflowId;

    while (currId) {
      const node = nodes.find((n) => n.id === currId);
      if (!node) break;
      result.unshift({
        id: node.id,
        name: String(node.data?.name ?? "Subflow"),
      });
      currId = node.parentNode || null;
    }

    return result;
  }, [currentSubflowId, nodes]);

  if (!currentSubflowId) return null;

  return (
    <div
      className={cn(
        "absolute bottom-6 left-20 z-50 rounded-lg border border-border bg-background/90 px-3 py-1.5 shadow-lg backdrop-blur",
        className
      )}
    >
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <button
                type="button"
                onClick={() => onNavigate(null)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Main
              </button>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {path.map((segment) => (
            <Fragment key={segment.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {segment.id === currentSubflowId ? (
                  <BreadcrumbPage className="text-indigo-700 text-lg">
                    {segment.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      onClick={() => onNavigate(segment.id)}
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {segment.name}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
