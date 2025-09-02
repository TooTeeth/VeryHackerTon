import React from "react";
import Image from "next/image";
import Link from "next/link";
import MintButton from "../Vygdrasil/MintButton";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  content?: string;
};
export default function BattleModal({ isOpen, onClose }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-gray-100 rounded-lg max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
          ✕
        </button>
        <div className="font-bold text-2xl mb-5 items-center justify-center flex">칭호 NFT: 비그드라실을 지켜낸</div>
        <div className="flex justify-center items-center ">
          <Image src={"/Vygddrasilpage/compensation.png"} alt="NFT" width={320} height={320} />
        </div>

        <div className="flex items-center flex-col justify-center mt-10 text-2xl fond-bold ">
          <MintButton tokenId={0} amount={1} />
          <div className="mt-3 ">
            <Link href={"/play"}>처음으로 돌아가기</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
