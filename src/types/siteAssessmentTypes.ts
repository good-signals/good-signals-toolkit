import { Database } from "@/integrations/supabase/types";

export type SiteAssessment = Database["public"]["Tables"]["site_assessments"]["Row"] & {
  site_signal_score?: number | null;
  completion_percentage?: number | null;
  executive_summary?: string | null;
  last_summary_generated_at?: string | null;
  site_status?: string | null;
  assessment_metric_values?: AssessmentMetricValue[];
  site_visit_ratings?: AssessmentSiteVisitRatingInsert[];
};

export type SiteAssessmentInsert = Database["public"]["Tables"]["site_assessments"]["Insert"];

export type SiteAssessmentUpdate = Database["public"]["Tables"]["site_assessments"]["Update"] & {
  site_signal_score?: number | null;
  completion_percentage?: number | null;
  executive_summary?: string | null;
  last_summary_generated_at?: string | null;
  site_status?: string | null;
};

export type AssessmentSiteVisitRating = Database["public"]["Tables"]["assessment_site_visit_ratings"]["Row"];
export type AssessmentSiteVisitRatingInsert = Database["public"]["Tables"]["assessment_site_visit_ratings"]["Insert"] & { image_url?: string | null };

// New types for Assessment Metric Values
export type AssessmentMetricValue = Database["public"]["Tables"]["assessment_metric_values"]["Row"];
export type AssessmentMetricValueInsert = Database["public"]["Tables"]["assessment_metric_values"]["Insert"] & { image_url?: string | null };
export type AssessmentMetricValueUpdate = Database["public"]["Tables"]["assessment_metric_values"]["Update"] & { image_url?: string | null };

export type SiteVisitCriterionKey = Database["public"]["Enums"]["site_visit_criterion_key"];
export type SiteVisitRatingGrade = Database["public"]["Enums"]["site_visit_rating_grade"];

export const siteVisitCriteria: { key: SiteVisitCriterionKey; label: string; description: string; grades: { grade: SiteVisitRatingGrade, description: string }[] }[] = [
  {
    key: "visibility",
    label: "Visibility",
    description: "How easily can the site be seen?",
    grades: [
      { grade: "A", description: "Highly prominent, standout location" },
      { grade: "B", description: "Easy to see from main traffic flow" },
      { grade: "C", description: "Average visibility, depends on angle/time" },
      { grade: "D", description: "Hard to notice unless you're looking for it" },
      { grade: "F", description: "Obstructed, can't see it from street" },
    ],
  },
  {
    key: "signage",
    label: "Signage",
    description: "What are the signage options and quality?",
    grades: [
      { grade: "A", description: "Large, prominent signage — prime placement" },
      { grade: "B", description: "Good signage space, visible and permitted" },
      { grade: "C", description: "Basic signage allowed, needs review" },
      { grade: "D", description: "Very limited or hard-to-see signage options" },
      { grade: "F", description: "No signage allowed or possible" },
    ],
  },
  {
    key: "accessibility",
    label: "Accessibility",
    description: "How easy is it for customers to access the site?",
    grades: [
      { grade: "A", description: "Multiple clear access points, great flow" },
      { grade: "B", description: "Easy and intuitive for customers" },
      { grade: "C", description: "Standard access, no major issues" },
      { grade: "D", description: "Limited access (e.g., one-way, odd turns)" },
      { grade: "F", description: "Difficult to enter/exit, confusing or unsafe" },
    ],
  },
  {
    key: "parking",
    label: "Parking",
    description: "What is the parking situation like?",
    grades: [
      { grade: "A", description: "Plentiful, convenient, and well-maintained parking" },
      { grade: "B", description: "Adequate, easy-to-use parking" },
      { grade: "C", description: "Basic parking available, may get tight" },
      { grade: "D", description: "Very limited or inconvenient parking" },
      { grade: "F", description: "No nearby parking, difficult for customers" },
    ],
  },
  {
    key: "loading",
    label: "Loading",
    description: "What are the loading/unloading facilities?",
    grades: [
      { grade: "A", description: "Easy, private, or designated loading zone" },
      { grade: "B", description: "Functional loading area, meets basic needs" },
      { grade: "C", description: "Loading possible but not ideal" },
      { grade: "D", description: "Difficult, restricted hours or tight space" },
      { grade: "F", description: "No loading access at all" },
    ],
  },
  {
    key: "safety",
    label: "Safety",
    description: "How safe does the area feel?",
    grades: [
      { grade: "A", description: "Clearly safe, secure area with positive energy" },
      { grade: "B", description: "Feels generally safe and well-lit" },
      { grade: "C", description: "Mixed — not bad but not great" },
      { grade: "D", description: "Seems sketchy, especially after hours" },
      { grade: "F", description: "Feels unsafe, visible issues (loitering, crime, hazards)" },
    ],
  },
  {
    key: "aesthetics",
    label: "Aesthetics",
    description: "What is the visual appeal of the site?",
    grades: [
      { grade: "A", description: "On-brand, beautiful space — impressive curb appeal" },
      { grade: "B", description: "Clean, modern, visually appealing" },
      { grade: "C", description: "Neutral appearance, could work with updates" },
      { grade: "D", description: "Outdated or inconsistent with your brand" },
      { grade: "F", description: "Run-down, dirty, or unattractive" },
    ],
  },
  {
    key: "storefront_traffic",
    label: "Storefront Traffic",
    description: "What is the volume and type of traffic passing the storefront?",
    grades: [
      { grade: "A", description: "High-volume foot or drive-by traffic, ideal audience" },
      { grade: "B", description: "Regular, steady traffic with potential customers" },
      { grade: "C", description: "Some traffic, not sure if it's your audience" },
      { grade: "D", description: "Sparse or inconsistent traffic" },
      { grade: "F", description: "Very low or dead foot/vehicle traffic" },
    ],
  },
  {
    key: "layout_size_of_space",
    label: "Layout & Size of Space",
    description: "How well does the layout and size suit the intended use?",
    grades: [
      { grade: "A", description: "Excellent match — efficient layout and right-sized for concept" },
      { grade: "B", description: "Good flow and size for current operational model" },
      { grade: "C", description: "Usable, but not ideal — needs adaptation or rework" },
      { grade: "D", description: "Awkward flow or undersized/oversized for needs" },
      { grade: "F", description: "Bad layout and wrong size — major functional issues" },
    ],
  },
  {
    key: "delivery_condition",
    label: "Delivery Condition",
    description: "What is the condition of the space upon delivery?",
    grades: [
      { grade: "A", description: "Fully Turnkey / Second Gen Fit: Already built out for your use" },
      { grade: "B", description: "Turnkey Light: Nearly move-in ready — just branding and light work" },
      { grade: "C", description: "White Box: Usable foundation with finishes, still needs fit-out" },
      { grade: "D", description: "Warm Shell: Basic MEPs installed, but major interior work needed" },
      { grade: "F", description: "Cold Shell: No systems or finishes — full buildout required" },
    ],
  },
];
