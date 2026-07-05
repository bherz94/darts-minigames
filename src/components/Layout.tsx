import Header from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white select-none">
      <Header />
      <div className="pt-14">
        {children}
      </div>
    </div>
  );
}
