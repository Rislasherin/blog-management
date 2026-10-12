import Link from "next/link";
import type { PaginationData } from "@/types/api.types";

interface PaginationProps {
  pagination: PaginationData;
  baseUrl: string;
}

export function Pagination({ pagination, baseUrl }: PaginationProps) {
  const { page, totalPages } = pagination;
  
  if (totalPages <= 1) return null;

  const getUrl = (p: number) => {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}page=${p}`;
  };

  return (
    <div className="flex items-center justify-center space-x-4 mt-12 mb-8">
      {page > 1 ? (
        <Link 
          href={getUrl(page - 1)}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          Previous
        </Link>
      ) : (
        <button disabled className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed">
          Previous
        </button>
      )}

      <span className="text-sm text-gray-600">
        Page <span className="font-semibold text-gray-900">{page}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalPages}</span>
      </span>

      {page < totalPages ? (
        <Link 
          href={getUrl(page + 1)}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          Next
        </Link>
      ) : (
        <button disabled className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed">
          Next
        </button>
      )}
    </div>
  );
}
