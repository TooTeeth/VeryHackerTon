import FilterBar from "../FBar/FilterBar";

export default function PoolTable() {
  return (
    <div className="overflow-x-auto rounded-lg bg-gray-50 border border-gray-200  py-2 max-w-7xl mx-auto">
      <FilterBar />
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50  ">
          <tr>
            <th>Title</th>
            <th>Era</th>
            <th>GM</th>
            <th>Storyline</th>
            <th>Infor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100"></tbody>
      </table>
    </div>
  );
}
