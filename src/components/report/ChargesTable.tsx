import { Charge } from "@/lib/demoReportData";

interface ChargesTableProps {
  charges: Charge[];
}

export function ChargesTable({ charges }: ChargesTableProps) {
  if (charges.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="py-4 px-2 text-center text-muted-foreground">
          No charges found
        </td>
      </tr>
    );
  }

  return (
    <>
      {charges.map((charge, index) => (
        <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
          <td className="py-3 px-3 text-foreground font-medium">{charge.type}</td>
          <td className="py-3 px-3 text-foreground">{charge.name || charge.description || "—"}</td>
          <td className="py-3 px-3 text-foreground font-semibold">{charge.amount || "—"}</td>
          <td className="py-3 px-3 text-foreground">{charge.date || "—"}</td>
          <td className="py-3 px-3 text-foreground">{charge.paidOff || "—"}</td>
        </tr>
      ))}
    </>
  );
}
