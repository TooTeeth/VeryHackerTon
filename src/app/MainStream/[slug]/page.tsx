// src/app/MainStream/[slug]/page.tsx

import { notFound } from "next/navigation";
import VygddrasilPage from "../../../components/MainStream/VygddrasilPage";
import ObfuscatePage from "../../../components/MainStream/ObfuscatePage";
import VpunkPage from "../../../components/MainStream/VpunkPage";

type Props = {
  params: {
    slug: string;
  };
};

export default function GamePage({ params }: Props) {
  const { slug } = params;

  switch (slug) {
    case "Vygddrasil":
      return <VygddrasilPage />;
    case "Vpunk":
      return <VpunkPage />;
    case "Obfuscate":
      return <ObfuscatePage />;
    default:
      return notFound();
  }
}
