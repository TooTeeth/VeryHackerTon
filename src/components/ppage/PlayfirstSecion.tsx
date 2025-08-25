export default function PlayfirstSection() {
  return (
    <section
      style={{
        position: "relative",
        height: "100vh",
      }}
    >
      {/* Main Video */}
      <video className="absolute top-0 left-0 w-full h-full object-cover z-0 " autoPlay muted loop playsInline>
        <source src="/videos/playvideos/verynode.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </section>
  );
}
