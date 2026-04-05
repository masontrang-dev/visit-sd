export default function Loading() {
  return (
    <main className="min-h-screen">
      <div className="p-6 pb-4 border-b border-brd">
        <div className="h-3 w-24 bg-bg2 rounded-pill animate-pulse" />
      </div>
      <div className="border-b-2 border-txt">
        <div className="w-full h-[400px] bg-bg2 animate-pulse" />
        <div className="p-6">
          <div className="h-3 w-20 bg-bg2 rounded-pill animate-pulse mb-3" />
          <div className="h-12 w-3/4 bg-bg2 animate-pulse mb-4" />
          <div className="flex gap-3">
            <div className="h-4 w-24 bg-bg2 rounded-pill animate-pulse" />
            <div className="h-4 w-16 bg-bg2 rounded-pill animate-pulse" />
          </div>
        </div>
      </div>
      <div className="p-6 border-b border-brd">
        <div className="h-5 w-16 bg-bg2 animate-pulse mb-3" />
        <div className="h-4 w-full bg-bg2 animate-pulse mb-2" />
        <div className="h-4 w-2/3 bg-bg2 animate-pulse" />
      </div>
    </main>
  );
}
