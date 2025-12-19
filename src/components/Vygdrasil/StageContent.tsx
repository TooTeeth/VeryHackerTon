// components/Vygddrasil/StageContent.tsx

import React from "react";
import Image from "next/image";
import { StageMeta } from "../../types/vygddrasil.types";

interface StageContentProps {
  stageMeta: StageMeta | null;
}

export const StageContent: React.FC<StageContentProps> = ({ stageMeta }) => {
  if (!stageMeta) return null;

  return (
    <>
      <h2 className="mt-10 mb-6 text-4xl font-bold text-left max-w-prose mx-0 text-gray-300">
        {stageMeta.title}
      </h2>
      <Image
        src={stageMeta.image_url}
        alt={stageMeta.title || "stage image"}
        width={320}
        height={320}
        className="mb-4 rounded-lg shadow-lg"
        priority
      />
      <p className="mt-4 mb-6 text-2xl text-left text-gray-300 shadow max-w-prose mx-0">
        {stageMeta.description}
      </p>
    </>
  );
};
