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
        <tr key={index} className="border-b border-border/20 last:border-0">
          <td className="py-2.5 px-3 text-foreground/80 font-medium">{charge.type}</td>
          <td className="py-2.5 px-3 text-foreground/65 leading-[1.6]">{charge.name || charge.description || "—"}</td>
          <td className="py-2.5 px-3 text-foreground/80 font-medium whitespace-nowrap">{charge.amount || "—"}</td>
        </tr>
      ))}
    </>
  );
}
