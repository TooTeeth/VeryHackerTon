import Link from "next/link";

export default function VygddrasilPage() {
  return (
    <section className="relative h-screen bg-cover bg-center z-0" style={{ backgroundImage: "url('/Vygddrasilpage/VygddrasilBackground.png')" }}>
      <div className="flex flex-col h-full justify-center items-center text-white z-10">
        <Link href="/vygddrasil/new" className="text-4xl font-bold mt-40">
          New
        </Link>
        <Link href="/play" className="text-4xl font-bold mt-10">
          Continue
        </Link>
      </div>
    </section>
  );
}
