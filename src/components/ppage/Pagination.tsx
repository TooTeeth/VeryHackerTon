import React from "react";

import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

type PaginationProps = {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
};

export function Pagination({ totalItems, itemsPerPage, currentPage, setCurrentPage }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className=" flex justify-center items-center space-x-2 z-3 relative mb-4">
      <button onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage === 1} className="hover:text-gray-700 hover:scale-150">
        <IoIosArrowBack />
      </button>

      {pages.map((page) => (
        <button key={page} onClick={() => setCurrentPage(page)} className={`px-4 py-2 rounded ${currentPage === page ? "text-2xl border-b-2 border-black hover:scale-105 " : "text-sm "}`}>
          {page}
        </button>
      ))}

      <button onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages} className="hover:text-gray-700 hover:scale-150">
        <IoIosArrowForward />
      </button>
    </div>
  );
}
