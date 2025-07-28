import Image from "next/image";
import PoolTable from "../../components/PTable/PoolTable";

export default function Play() {
  return (
    <div>
      <div className=" border-b-2">
        <main className="font-baloo text-5xl font-bold mt-16 pt-10 flex justify-center items-center  ">Main Stream</main>
        <Image src={"/Playpage/WorldTree.png"} alt="WorldTree" width={400} height={0} className=" w-[900px] h-[500px]  rounded-2xl border-2 block mx-auto p-4" />
      </div>
      <div className="pt-4 bg-gray-50">
        <PoolTable />
      </div>
    </div>
  );
}
