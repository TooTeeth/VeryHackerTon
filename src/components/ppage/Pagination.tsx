import React from "react";

import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

type PaginationProps = {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  variant?: "light" | "dark";
};

export function Pagination({ totalItems, itemsPerPage, currentPage, setCurrentPage, variant = "light" }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const isDark = variant === "dark";
  const textColor = isDark ? "text-white" : "";
  const hoverColor = isDark ? "hover:text-gray-300" : "hover:text-gray-700";
  const borderColor = isDark ? "border-white" : "border-black";

  return (
    <div className={`flex justify-center items-center space-x-2 z-3 relative mb-4 ${textColor}`}>
      <button onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage === 1} className={`${hoverColor} hover:scale-150 disabled:opacity-50`}>
        <IoIosArrowBack />
      </button>

      {pages.map((page) => (
        <button key={page} onClick={() => setCurrentPage(page)} className={`px-4 py-2 rounded ${currentPage === page ? `text-2xl border-b-2 ${borderColor} hover:scale-105` : "text-sm"}`}>
          {page}
        </button>
      ))}

      <button onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages} className={`${hoverColor} hover:scale-150 disabled:opacity-50`}>
        <IoIosArrowForward />
      </button>
    </div>
  );
}
