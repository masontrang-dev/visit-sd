export default function Loading() {
  return (
    <main className="min-h-screen">
      <div className="p-6 pb-4 border-b border-brd">
        <div className="h-3 w-24 rounded-pill skeleton" />
      </div>
      <div className="border-b-2 border-txt">
        <div className="w-full h-[400px] skeleton" />
        <div className="p-6">
          <div className="h-3 w-20 rounded-pill skeleton mb-3" />
          <div className="h-12 w-3/4 skeleton mb-4" />
          <div className="flex gap-3">
            <div className="h-4 w-24 rounded-pill skeleton" />
            <div className="h-4 w-16 rounded-pill skeleton" />
          </div>
        </div>
      </div>
      <div className="p-6 border-b border-brd">
        <div className="h-5 w-16 skeleton mb-3" />
        <div className="h-4 w-full skeleton mb-2" />
        <div className="h-4 w-2/3 skeleton" />
      </div>
    </main>
  );
}
