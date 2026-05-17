export default function Loading() {
  return (
    <main className="min-h-screen pb-24">
      {/* Breadcrumb / back-nav */}
      <div className="sticky top-0 z-10 bg-bg p-6 pb-4 border-b border-brd">
        <div className="h-3 w-28 rounded-pill skeleton" />
      </div>

      {/* Restaurant header — hero photo + name + meta */}
      <div className="border-b-2 border-txt">
        {/* Hero carousel placeholder (matches aspect-[16/9] max-h-[320px]) */}
        <div className="w-full aspect-[16/9] max-h-[320px] skeleton" />
        <div className="px-6 pt-5 pb-4">
          {/* Cuisine + open-now chip row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <div className="h-3 w-20 rounded-pill skeleton" />
            <div className="h-4 w-16 rounded-pill skeleton" />
          </div>
          {/* Restaurant name (large display heading) */}
          <div className="h-12 sm:h-14 w-3/4 skeleton mb-3" />
          {/* Neighborhood · price row */}
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <div className="h-4 w-32 rounded-pill skeleton" />
            <div className="h-4 w-10 rounded-pill skeleton" />
          </div>
          {/* Address row */}
          <div className="h-3 w-2/3 rounded-pill skeleton mb-3" />
          {/* Tag chips */}
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <div className="h-5 w-20 rounded-pill skeleton" />
            <div className="h-5 w-24 rounded-pill skeleton" />
            <div className="h-5 w-16 rounded-pill skeleton" />
          </div>
        </div>
      </div>

      {/* Ratings row — 3 columns (Google, My Rating, Check-ins) */}
      <div className="flex items-stretch border-b border-brd">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 py-3 px-3 flex flex-col items-center gap-2 ${
              i < 2 ? "border-r border-brd" : ""
            }`}
          >
            <div className="h-9 w-12 skeleton" />
            <div className="h-3 w-16 rounded-pill skeleton" />
          </div>
        ))}
      </div>

      {/* Action bar (check-in / wishlist / etc.) */}
      <div className="flex items-center gap-3 p-6 border-b border-brd">
        <div className="h-10 flex-1 skeleton" />
        <div className="h-10 w-10 skeleton" />
        <div className="h-10 w-10 skeleton" />
      </div>

      {/* Section: menu items / recommendations */}
      <section className="p-6 border-b border-brd">
        <div className="h-5 w-32 skeleton mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded-pill skeleton" />
          <div className="h-4 w-5/6 rounded-pill skeleton" />
          <div className="h-4 w-4/6 rounded-pill skeleton" />
        </div>
      </section>

      {/* Section: visit history */}
      <section className="p-6 border-b border-brd">
        <div className="h-5 w-28 skeleton mb-4" />
        <div className="space-y-4">
          <div className="h-16 w-full skeleton" />
          <div className="h-16 w-full skeleton" />
        </div>
      </section>
    </main>
  );
}
