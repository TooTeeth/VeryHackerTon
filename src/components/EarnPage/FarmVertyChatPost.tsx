import Image from "next/image";

export default function FarmVeryChatPost() {
  return (
    <section
      id="FramVeryChatPost-section"
      style={{
        position: "relative",
        height: "70vh",
        backgroundImage: "url('/Earnpage/VeryBackGround.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="flex flex-col font-bold ">
        <a href="https://invite.verychat.io/Tooteeth" target="_blank" rel="noopener noreferrer" className="mt-5">
          <Image src={"/Earnpage/logo.png"} alt="logo" width={461} height={492} />
        </a>

        <div className="flex flex-row gap-4 mt-5 justify-center">
          <a href="https://invite.verychat.io/Tooteeth" target="_blank" rel="noopener noreferrer">
            <Image src={"/Earnpage/Google.png"} alt="Google" width={161} height={161} />
          </a>
          <a href="https://invite.verychat.io/Tooteeth" target="_blank" rel="noopener noreferrer">
            <Image src={"/Earnpage/Apple.png"} alt="Apple" width={161} height={161} />
          </a>
        </div>
      </div>
    </section>
  );
}
