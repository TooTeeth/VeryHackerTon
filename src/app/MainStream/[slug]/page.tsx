// import { notFound } from "next/navigation";
// import VygddrasilPage from "../../../components/MainStream/VygddrasilPage";
// import ObfuscatePage from "../../../components/MainStream/ObfuscatePage";
// import VpunkPage from "../../../components/MainStream/VpunkPage";

// type Params = { slug: string };

// export default async function GamePage({ params }: { params: Promise<Params> }) {
//   const { slug } = await params;

//   switch (slug) {
//     case "Vygddrasil":
//       return <VygddrasilPage />;
//     case "Vpunk":
//       return <VpunkPage />;
//     case "Obfuscate":
//       return <ObfuscatePage />;
//     default:
//       return notFound();
//   }
// }

export default function Gamepage() {
  return <div>as</div>;
}
