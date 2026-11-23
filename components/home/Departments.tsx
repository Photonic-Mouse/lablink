import type { Equipment } from "@/lib/seed";

const departmentCopy = [
  ["Electronics", "01 / CIRCUITS & SILICON", "ELECTRONICS"],
  ["Mechanical", "02 / MOTION & DYNAMICS", "MECHANICAL"],
  ["Computer Science", "03 / CODE & COMPUTE", "COMPUTER SCIENCE"],
  ["Chemistry", "04 / SYNTHESIS & ANALYSIS", "CHEMISTRY"],
  ["Biotech", "05 / LIFE & LAB", "BIOTECH"],
] as const;

export default function Departments({
  equipment,
  onDepartmentSelect,
}: {
  equipment: Equipment[];
  onDepartmentSelect: (department: string) => void;
}) {
  return (
    <section className="making section-pad" id="departments">
      <div className="making-heading">
        <div className="eyebrow"><b /> 01 — FIND YOUR DISCIPLINE</div>
        <h2>WHAT ARE YOU <em>MAKING?</em></h2>
        <p>Start with your discipline. Find allocated gear across 5 engineering and science departments.</p>
      </div>
      <div className="making-list">
        {departmentCopy.map(([department, label, name]) => {
          const count = equipment.filter((item) => item.dept === department).length;
          return (
            <button className="making-row" key={department} onClick={() => onDepartmentSelect(department)}>
              <span className="making-label">{label}</span>
              <strong>{name} <i>+</i></strong>
              <span className="making-link">EXPLORE {count} INSTRUMENTS ↗</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
