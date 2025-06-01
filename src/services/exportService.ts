
import { supabase } from '@/integrations/supabase/client';
import { CBSAData } from '@/types/territoryTargeterTypes';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { getAccountSignalThresholds } from './targetMetrics/accountHelpers';

// Add missing type exports
export interface ExportData {
  name: string;
  value: any;
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  includeImages?: boolean;
}

export const exportCBSADataToCSV = async (
  data: CBSAData[],
  fileName: string = 'cbsa_analysis_results',
  account: any = null
) => {
  const { goodThreshold, badThreshold } = getAccountSignalThresholds(account);

  const csvRows = [];

  // Headers
  const headers = Object.keys(data[0] || {}).filter(key => key !== 'geometry');
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header as keyof CBSAData];

      if (header === 'site_signal_score') {
        if (value === null || value === undefined) {
          return 'No Data';
        }
        if (typeof value === 'number') {
          if (value >= goodThreshold) {
            return 'Good';
          } else if (value <= badThreshold) {
            return 'Bad';
          } else {
            return 'Neutral';
          }
        }
      }

      if (typeof value === 'string') {
        value = value.replace(/"/g, '""');
        return `"${value}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  const csvData = csvRows.join('\n');
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', 'true');
  a.setAttribute('href', url);
  a.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const exportSiteAssessmentsToCSV = async (
  assessments: SiteAssessment[],
  fileName: string = 'site_assessments',
  account: any = null
) => {
  const { goodThreshold, badThreshold } = getAccountSignalThresholds(account);

  const csvRows = [];

  // Headers
  const headers = [
    "Assessment Name", "Address", "City", "State", "Zip Code", "Created At",
    "Site Signal Score", "Completion Percentage", "Site Status"
  ];
  csvRows.push(headers.join(','));

  for (const assessment of assessments) {
    const values = [
      `"${assessment.assessment_name.replace(/"/g, '""')}"`,
      `"${assessment.address_line1?.replace(/"/g, '""') || ''}"`,
      `"${assessment.city?.replace(/"/g, '""') || ''}"`,
      `"${assessment.state_province?.replace(/"/g, '""') || ''}"`,
      `"${assessment.postal_code?.replace(/"/g, '""') || ''}"`,
      `"${new Date(assessment.created_at).toLocaleDateString()}"`,
      (() => {
        if (assessment.site_signal_score === null || assessment.site_signal_score === undefined) {
          return 'No Data';
        }
        if (assessment.site_signal_score >= goodThreshold) {
          return 'Good';
        } else if (assessment.site_signal_score <= badThreshold) {
          return 'Bad';
        } else {
          return 'Neutral';
        }
      })(),
      `"${assessment.completion_percentage}"`,
      `"${assessment.site_status?.replace(/"/g, '""') || ''}"`
    ];
    csvRows.push(values.join(','));
  }

  const csvData = csvRows.join('\n');
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', 'true');
  a.setAttribute('href', url);
  a.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const exportAssessmentToPDF = async (assessment: SiteAssessment, options: ExportOptions = { format: 'pdf' }) => {
  // Stub implementation for PDF export
  console.log('Exporting assessment to PDF:', assessment.id);
  return { success: true };
};

export const uploadCSV = async (file: File): Promise<{ data: any[]; error: Error | null }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const data: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const row: any = {};

          for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j];
          }

          data.push(row);
        }

        resolve({ data, error: null });
      } catch (error: any) {
        console.error("Error parsing CSV:", error);
        reject({ data: [], error: new Error(error.message || "Failed to parse CSV data.") });
      }
    };

    reader.onerror = () => {
      reject({ data: [], error: new Error("Failed to read the CSV file.") });
    };

    reader.readAsText(file);
  });
};
