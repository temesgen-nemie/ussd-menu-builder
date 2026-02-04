import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

const getPageItems = (page: number, totalPages: number) => {
  if (totalPages <= 1) return [1];
  const siblings = 5;
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = page - siblings; i <= page + siblings; i += 1) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  let prev = 0;
  for (const current of sorted) {
    const gap = current - prev;
    if (gap === 2) {
      result.push(prev + 1);
    } else if (gap > 2) {
      result.push("ellipsis");
    }
    result.push(current);
    prev = current;
  }
  return result;
};

export default function PaginationControls({
  page,
  totalPages,
  onPageChange,
  disabled,
  className,
}: PaginationControlsProps) {
  const canPrev = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled;
  const items = getPageItems(page, Math.max(totalPages, 1));

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={!canPrev}
            className={cn(
              "cursor-pointer select-none",
              !canPrev && "pointer-events-none opacity-50"
            )}
            onClick={(event) => {
              event.preventDefault();
              if (canPrev) onPageChange(page - 1);
            }}
          />
        </PaginationItem>
        {items.map((item, index) => (
          <PaginationItem key={`${item}-${index}`}>
            {item === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                isActive={item === page}
                className="cursor-pointer"
                onClick={(event) => {
                  event.preventDefault();
                  if (!disabled && item !== page) onPageChange(item);
                }}
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={!canNext}
            className={cn(
              "cursor-pointer select-none",
              !canNext && "pointer-events-none opacity-50"
            )}
            onClick={(event) => {
              event.preventDefault();
              if (canNext) onPageChange(page + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
