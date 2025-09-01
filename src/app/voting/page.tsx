export default function VotingTable() {
  const data = [
    { title: "Title 1", ongoing: 3 },
    { title: "Title 2", ongoing: 3 },
    { title: "Title 3", ongoing: 3 },
    { title: "Title 4", ongoing: 3 },
    { title: "Title 5", ongoing: 3 },
    { title: "Title 6", ongoing: 3 },
    { title: "Title 7", ongoing: 3 },
    { title: "Title 8", ongoing: 3 },
  ];

  return (
    <div className="w-full min-h-screen bg-white p-8 flex justify-center items-start mt-40">
      <div className="w-full max-w-7xl">
        {/* Ongoing Title */}
        <div className="text-4xl font-bold mb-5">Ongoing</div>

        {/* Table Container */}
        <div className="w-full border border-black">
          {/* Table Header */}
          <div className="grid grid-cols-5 bg-gray-800 text-white font-bold text-lg border-b border-black text-center">
            <div className="p-4 border-r border-black">Title</div>
            <div className="p-4 border-r border-black">Voting details</div>
            <div className="p-4 border-r border-black">+</div>
            <div className="p-4 border-r border-black">-</div>
            <div className="p-4">Progress</div>
          </div>

          {/* Table Rows */}
          {data.map((item, index) => (
            <div key={index} className="grid grid-cols-5 border-b border-black text-center">
              <div className="p-4 border-r border-black">{item.title}</div>
              <div className="p-4 border-r border-black">{item.ongoing}</div>
              <div className="p-4 border-r border-black text-green-600 font-bold cursor-pointer hover:bg-green-100">+</div>
              <div className="p-4 border-r border-black text-red-600 font-bold cursor-pointer hover:bg-red-100">-</div>
              <div className="p-4 text-black font-semibold">100:20</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
